import {
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { OutboxEventType, PaymentMethod, PaymentStatus } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { ConfirmCashPaymentDto } from "./dto/confirm-cash-payment.dto";
import { ListPaymentsQueryDto } from "./dto/list-payments-query.dto";
import { InitiatePawaPayDto } from "./dto/initiate-pawapay.dto";
import { PawaPayClient } from "./pawapay.client";
import { randomUUID } from "crypto";

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pawapay: PawaPayClient,
  ) {}

  getPawaPayConfiguration() {
    return this.pawapay.activeConfiguration();
  }

  async initiatePawaPay(dto: InitiatePawaPayDto, customerId: string) {
    const order = await this.prisma.order.findFirst({
      where: { reference: dto.reference, customerId },
      include: { payments: true },
    });
    if (!order) throw new NotFoundException("Commande introuvable.");
    const payment = order.payments.find(
      (item) => item.method === PaymentMethod.MOBILE_MONEY,
    );
    if (!payment)
      throw new ConflictException("Cette commande n’utilise pas Mobile Money.");
    if (payment.status === PaymentStatus.SUCCEEDED) return payment;
    if (
      payment.status === PaymentStatus.PROCESSING &&
      payment.providerReference
    ) {
      return this.reconcilePawaPay(payment.providerReference);
    }
    if (
      payment.status !== PaymentStatus.PENDING &&
      payment.status !== PaymentStatus.FAILED
    ) {
      throw new ConflictException(`Ce paiement est ${payment.status}.`);
    }
    const depositId = randomUUID();
    await this.prisma.payment.update({
      where: { id: payment.id },
      data: {
        provider: "PAWAPAY",
        providerReference: depositId,
        payerPhone: dto.phoneNumber,
        status: PaymentStatus.PROCESSING,
        failureReason: null,
      },
    });
    try {
      const providerResponse = await this.pawapay.initiateDeposit({
        depositId,
        payer: {
          type: "MMO",
          accountDetails: {
            phoneNumber: dto.phoneNumber,
            provider: dto.provider,
          },
        },
        amount: payment.amount.toFixed(0),
        currency: payment.currency,
        clientReferenceId: order.reference,
        customerMessage: `Paiement ${order.reference}`,
        metadata: { orderId: order.id, paymentId: payment.id },
      });
      if (providerResponse.status === "REJECTED") {
        await this.prisma.payment.update({
          where: { id: payment.id },
          data: {
            status: PaymentStatus.FAILED,
            failureReason: JSON.stringify(
              providerResponse.rejectionReason ??
                providerResponse.failureReason ??
                "Rejeté",
            ),
          },
        });
      }
      return {
        paymentId: payment.id,
        depositId,
        status: providerResponse.status,
      };
    } catch (error) {
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: PaymentStatus.FAILED,
          failureReason: "Échec de l’initiation PawaPay",
        },
      });
      throw error;
    }
  }

  async reconcilePawaPay(depositId: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { providerReference: depositId },
      include: { order: true },
    });
    if (!payment) throw new NotFoundException("Paiement PawaPay introuvable.");
    const response = await this.pawapay.getDeposit(depositId);
    const providerStatus = response?.data?.status;
    if (response?.status !== "FOUND" || !providerStatus)
      return { payment, providerStatus: response?.status ?? "NOT_FOUND" };
    const succeeded = providerStatus === "COMPLETED";
    const terminalFailure = ["FAILED", "REJECTED", "CANCELLED"].includes(
      providerStatus,
    );
    if (!succeeded && !terminalFailure) return { payment, providerStatus };
    const status = succeeded ? PaymentStatus.SUCCEEDED : PaymentStatus.FAILED;
    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.payment.update({
        where: { id: payment.id },
        data: {
          status,
          paidAt: succeeded ? new Date() : null,
          failureReason: terminalFailure ? providerStatus : null,
        },
      });
      if (payment.status !== status)
        await tx.outboxEvent.create({
          data: {
            type: succeeded
              ? OutboxEventType.PAYMENT_SUCCEEDED
              : OutboxEventType.PAYMENT_FAILED,
            orderId: payment.orderId,
            payload: {
              reference: payment.order.reference,
              customerPhone: payment.order.customerPhone,
              paymentId: payment.id,
              amount: payment.amount.toString(),
              currency: payment.currency,
              method: payment.method,
            },
          },
        });
      return result;
    });
    return { payment: updated, providerStatus };
  }

  async list(query: ListPaymentsQueryDto) {
    const where = {
      ...(query.status && { status: query.status }),
      ...(query.method && { method: query.method }),
    };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.payment.findMany({
        where,
        include: {
          order: {
            select: {
              id: true,
              reference: true,
              customerName: true,
              customerPhone: true,
              status: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.prisma.payment.count({ where }),
    ]);
    return {
      data,
      meta: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }

  async confirmCash(id: string, actorId: string, dto: ConfirmCashPaymentDto) {
    return this.prisma.$transaction(async (tx) => {
      const payment = await tx.payment.findUnique({
        where: { id },
        include: { order: true },
      });
      if (!payment) throw new NotFoundException("Paiement introuvable.");
      if (payment.method !== PaymentMethod.CASH) {
        throw new ConflictException(
          "Seul un paiement en espèces peut être confirmé manuellement.",
        );
      }
      if (payment.status === PaymentStatus.SUCCEEDED) return payment;
      if (payment.status !== PaymentStatus.PENDING) {
        throw new ConflictException(
          `Un paiement ${payment.status} ne peut pas être confirmé.`,
        );
      }

      const updated = await tx.payment.update({
        where: { id },
        data: {
          status: PaymentStatus.SUCCEEDED,
          paidAt: new Date(),
          confirmedById: actorId,
        },
        include: { order: true },
      });
      await tx.outboxEvent.create({
        data: {
          type: OutboxEventType.PAYMENT_SUCCEEDED,
          orderId: payment.orderId,
          payload: {
            reference: payment.order.reference,
            customerPhone: payment.order.customerPhone,
            paymentId: payment.id,
            amount: payment.amount.toString(),
            currency: payment.currency,
            method: payment.method,
            note: dto.note?.trim() ?? null,
          },
        },
      });
      return updated;
    });
  }

  async refundCash(id: string, actorId: string, dto: ConfirmCashPaymentDto) {
    return this.prisma.$transaction(async (tx) => {
      const payment = await tx.payment.findUnique({
        where: { id },
        include: { order: true },
      });
      if (!payment) throw new NotFoundException("Paiement introuvable.");
      if (
        payment.method !== PaymentMethod.CASH ||
        payment.status !== PaymentStatus.SUCCEEDED
      ) {
        throw new ConflictException(
          "Seul un paiement en espèces encaissé peut être remboursé manuellement.",
        );
      }
      return tx.payment.update({
        where: { id },
        data: {
          status: PaymentStatus.REFUNDED,
          failureReason: dto.note?.trim() ?? "Remboursement manuel",
          confirmedById: actorId,
        },
        include: { order: true },
      });
    });
  }
}
