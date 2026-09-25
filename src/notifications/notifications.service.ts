import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Interval } from "@nestjs/schedule";
import { OutboxEvent, OutboxStatus, UserRole } from "@prisma/client";
import * as webpush from "web-push";
import { AuthenticatedUser } from "../auth/auth.types";
import { PrismaService } from "../prisma/prisma.service";
import { ListOutboxQueryDto } from "./dto/list-outbox-query.dto";
import { PushSubscriptionDto } from "./dto/push-subscription.dto";
import { SubscribeOrderDto } from "./dto/subscribe-order.dto";

@Injectable()
export class NotificationsService {
  private readonly pushEnabled: boolean;
  private processing = false;

  constructor(
    private readonly prisma: PrismaService,
    config: ConfigService,
  ) {
    const subject = config.get<string>("VAPID_SUBJECT");
    const publicKey = config.get<string>("VAPID_PUBLIC_KEY");
    const privateKey = config.get<string>("VAPID_PRIVATE_KEY");
    this.pushEnabled = !!subject && !!publicKey && !!privateKey;
    if (this.pushEnabled) {
      webpush.setVapidDetails(subject!, publicKey!, privateKey!);
    }
  }

  listEvents(query: ListOutboxQueryDto) {
    return this.prisma.outboxEvent.findMany({
      where: query.status ? { status: query.status } : undefined,
      orderBy: { createdAt: "desc" },
      take: 100,
    });
  }

  async listInApp(userId: string, unreadOnly = false) {
    const [data, unreadCount] = await this.prisma.$transaction([
      this.prisma.inAppNotification.findMany({
        where: { userId, ...(unreadOnly && { readAt: null }) },
        orderBy: { createdAt: "desc" },
        take: 100,
      }),
      this.prisma.inAppNotification.count({ where: { userId, readAt: null } }),
    ]);
    return { data, unreadCount };
  }

  async markRead(userId: string, id: string) {
    await this.prisma.inAppNotification.updateMany({
      where: { id, userId },
      data: { readAt: new Date() },
    });
    return { success: true };
  }

  async markAllRead(userId: string) {
    await this.prisma.inAppNotification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() },
    });
    return { success: true };
  }

  getPublicKey(): { publicKey: string | null; enabled: boolean } {
    return {
      publicKey: process.env.VAPID_PUBLIC_KEY ?? null,
      enabled: this.pushEnabled,
    };
  }

  subscribeAdmin(user: AuthenticatedUser, dto: PushSubscriptionDto) {
    return this.upsertSubscription(dto, {
      userId: user.id,
      customerPhone: null,
    });
  }

  async subscribeOrder(dto: SubscribeOrderDto, customerId: string) {
    const order = await this.prisma.order.findFirst({
      where: { reference: dto.reference, customerId },
      select: { customerPhone: true },
    });
    if (!order) return { success: false };
    await this.upsertSubscription(dto.subscription, {
      userId: customerId,
      customerPhone: order.customerPhone,
    });
    return { success: true };
  }

  async unsubscribe(endpoint: string): Promise<{ success: true }> {
    await this.prisma.pushSubscription.updateMany({
      where: { endpoint },
      data: { isActive: false },
    });
    return { success: true };
  }

  @Interval(10_000)
  async processPendingEvents(): Promise<void> {
    if (!this.pushEnabled || this.processing) return;
    this.processing = true;
    try {
      const events = await this.prisma.outboxEvent.findMany({
        where: {
          status: { in: [OutboxStatus.PENDING, OutboxStatus.FAILED] },
          nextAttemptAt: { lte: new Date() },
          attempts: { lt: 8 },
        },
        orderBy: { createdAt: "asc" },
        take: 10,
      });
      for (const event of events) await this.processEvent(event);
    } finally {
      this.processing = false;
    }
  }

  private async processEvent(event: OutboxEvent): Promise<void> {
    const claimed = await this.prisma.outboxEvent.updateMany({
      where: {
        id: event.id,
        status: { in: [OutboxStatus.PENDING, OutboxStatus.FAILED] },
      },
      data: { status: OutboxStatus.PROCESSING, attempts: { increment: 1 } },
    });
    if (claimed.count === 0) return;

    try {
      const payload = event.payload as Record<string, unknown>;
      const customerPhone =
        typeof payload.customerPhone === "string"
          ? payload.customerPhone
          : undefined;
      const subscriptions =
        event.type === "ORDER_CREATED"
          ? await this.prisma.pushSubscription.findMany({
              where: {
                isActive: true,
                user: { role: UserRole.ADMIN, isActive: true },
              },
            })
          : customerPhone
            ? await this.prisma.pushSubscription.findMany({
                where: { isActive: true, customerPhone },
              })
            : [];
      const notification = this.toPushPayload(event, payload);
      const results = await Promise.allSettled(
        subscriptions.map((subscription) =>
          webpush.sendNotification(
            {
              endpoint: subscription.endpoint,
              keys: { p256dh: subscription.p256dh, auth: subscription.auth },
            },
            JSON.stringify(notification),
          ),
        ),
      );
      let hasTransientFailure = false;
      for (let index = 0; index < results.length; index += 1) {
        const result = results[index];
        if (result.status === "rejected") {
          if (this.isExpiredPush(result.reason)) {
            await this.prisma.pushSubscription.update({
              where: { id: subscriptions[index].id },
              data: { isActive: false },
            });
          } else {
            hasTransientFailure = true;
          }
        }
      }
      if (hasTransientFailure) {
        throw new Error("Au moins une notification Push a échoué.");
      }
      await this.prisma.outboxEvent.update({
        where: { id: event.id },
        data: {
          status: OutboxStatus.SENT,
          processedAt: new Date(),
          lastError: null,
        },
      });
    } catch (error) {
      const delayMinutes = Math.min(60, 2 ** (event.attempts + 1));
      await this.prisma.outboxEvent.update({
        where: { id: event.id },
        data: {
          status: OutboxStatus.FAILED,
          lastError:
            error instanceof Error
              ? error.message.slice(0, 500)
              : "Erreur Push",
          nextAttemptAt: new Date(Date.now() + delayMinutes * 60_000),
        },
      });
    }
  }

  private upsertSubscription(
    dto: PushSubscriptionDto,
    owner: { userId: string | null; customerPhone: string | null },
  ) {
    return this.prisma.pushSubscription.upsert({
      where: { endpoint: dto.endpoint },
      create: {
        endpoint: dto.endpoint,
        p256dh: dto.keys.p256dh,
        auth: dto.keys.auth,
        ...owner,
      },
      update: {
        p256dh: dto.keys.p256dh,
        auth: dto.keys.auth,
        isActive: true,
        ...owner,
      },
    });
  }

  private toPushPayload(
    event: OutboxEvent,
    payload: Record<string, unknown>,
  ): { title: string; body: string; url: string } {
    const reference = this.safeText(payload.reference, "Commande");
    if (event.type === "ORDER_CREATED") {
      return {
        title: "Nouvelle commande",
        body: `${reference} — ${this.safeText(payload.total)} FCFA`,
        url: "/admin/orders",
      };
    }
    if (event.type === "PAYMENT_SUCCEEDED") {
      return {
        title: "Paiement confirmé",
        body: `Le paiement de ${reference} est confirmé.`,
        url: "/orders",
      };
    }
    return {
      title: "Commande mise à jour",
      body: `${reference} : ${this.safeText(payload.toStatus, "mise à jour")}`,
      url: "/orders",
    };
  }

  private isExpiredPush(error: unknown): boolean {
    if (!error || typeof error !== "object") return false;
    const statusCode = (error as { statusCode?: unknown }).statusCode;
    return statusCode === 404 || statusCode === 410;
  }

  private safeText(value: unknown, fallback = ""): string {
    return typeof value === "string" || typeof value === "number"
      ? String(value)
      : fallback;
  }
}
