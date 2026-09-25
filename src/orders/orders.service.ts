import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  FulfillmentType,
  OrderSource,
  OrderStatus,
  OutboxEventType,
  PaymentMethod,
  PaymentStatus,
  Prisma,
  ProductStatus,
  UserRole,
} from "@prisma/client";
import { randomBytes } from "crypto";
import { DeliveryService } from "../delivery/delivery.service";
import { AuthenticatedUser } from "../auth/auth.types";
import { PrismaService } from "../prisma/prisma.service";
import { StoreSettingsService } from "../store-settings/store-settings.service";
import { CreateOrderDto } from "./dto/create-order.dto";
import { CancelOrderDto } from "./dto/cancel-order.dto";
import { ListOrdersQueryDto } from "./dto/list-orders-query.dto";
import { UpdateOrderStatusDto } from "./dto/update-order-status.dto";
import { canTransitionOrder } from "./order-status.transitions";

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storeSettings: StoreSettingsService,
    private readonly deliveryService: DeliveryService,
  ) {}

  async create(
    dto: CreateOrderDto,
    idempotencyKey: string,
    customerId: string,
  ) {
    if (!idempotencyKey || idempotencyKey.length < 16) {
      throw new BadRequestException(
        "L’en-tête Idempotency-Key doit contenir au moins 16 caractères.",
      );
    }

    const existing = await this.findByIdempotencyKey(idempotencyKey);
    if (existing) {
      if (existing.customerId !== customerId) {
        throw new ConflictException("Cette clé de commande est déjà utilisée.");
      }
      return existing;
    }

    this.validateDelivery(dto);
    this.validateDistinctItems(dto);

    const now = new Date();
    const settings = await this.storeSettings.getSettings();
    const currentStatus = this.storeSettings.getPublicStatus(settings);
    const requestedFor = dto.requestedFor ? new Date(dto.requestedFor) : now;

    if (
      dto.paymentMethod === PaymentMethod.MOBILE_MONEY &&
      !settings.mobileMoneyEnabled
    ) {
      throw new ConflictException(
        "Le paiement Mobile Money n’est pas encore disponible.",
      );
    }

    if (requestedFor.getTime() < now.getTime() - 60_000) {
      throw new BadRequestException(
        "La date demandée ne peut pas être dans le passé.",
      );
    }
    if (!currentStatus.isOpen) {
      throw new ConflictException(currentStatus.message);
    }

    const productIds = dto.items.map((item) => item.productId);
    const products = await this.prisma.product.findMany({
      where: {
        id: { in: productIds },
        status: ProductStatus.ACTIVE,
        category: { isActive: true },
      },
    });
    if (products.length !== productIds.length) {
      throw new ConflictException(
        "Un ou plusieurs produits sont indisponibles.",
      );
    }

    const quantities = new Map(
      dto.items.map((item) => [item.productId, item.quantity]),
    );
    const subtotal = products.reduce(
      (sum, product) =>
        sum.plus(product.price.mul(quantities.get(product.id) ?? 0)),
      new Prisma.Decimal(0),
    );
    const deliveryQuote =
      dto.fulfillmentType === FulfillmentType.DELIVERY
        ? await this.deliveryService.quote(
            dto.deliveryLatitude,
            dto.deliveryLongitude,
            new Prisma.Decimal(settings.defaultDeliveryFee),
          )
        : null;
    const deliveryFee = deliveryQuote?.fee ?? new Prisma.Decimal(0);
    const total = subtotal.plus(deliveryFee);
    const window = this.storeSettings.getOrderingWindow(settings, requestedFor);
    const requestedPortions = products.reduce(
      (sum, product) =>
        sum + product.portions * (quantities.get(product.id) ?? 0),
      0,
    );
    const reference = this.createReference(now);

    try {
      return await this.prisma.$transaction(
        async (tx) => {
          const duplicate = await this.findByIdempotencyKey(idempotencyKey, tx);
          if (duplicate) {
            if (duplicate.customerId !== customerId) {
              throw new ConflictException(
                "Cette clé de commande est déjà utilisée.",
              );
            }
            return duplicate;
          }

          await this.assertCapacity(
            tx,
            window.start,
            window.end,
            settings.dailyOrderLimit,
            settings.dailyPortionLimit,
            requestedPortions,
          );

          const order = await tx.order.create({
            data: {
              reference,
              idempotencyKey,
              trackingToken: randomBytes(32).toString("hex"),
              source: OrderSource.WEB,
              customerId,
              fulfillmentType: dto.fulfillmentType,
              customerName: dto.customerName.trim(),
              customerPhone: dto.customerPhone.replace(/\s+/g, ""),
              deliveryAddress: dto.deliveryAddress?.trim(),
              deliveryLatitude:
                dto.deliveryLatitude === undefined
                  ? undefined
                  : new Prisma.Decimal(dto.deliveryLatitude),
              deliveryLongitude:
                dto.deliveryLongitude === undefined
                  ? undefined
                  : new Prisma.Decimal(dto.deliveryLongitude),
              deliveryInstructions: dto.deliveryInstructions?.trim(),
              deliveryZoneId: deliveryQuote?.zoneId,
              deliveryZoneName: deliveryQuote?.zoneName,
              subtotal,
              deliveryFee,
              total,
              requestedFor,
              items: {
                create: products.map((product) => {
                  const quantity = quantities.get(product.id) ?? 0;
                  return {
                    productId: product.id,
                    productName: product.name,
                    unitPrice: product.price,
                    quantity,
                    portions: product.portions,
                    lineTotal: product.price.mul(quantity),
                  };
                }),
              },
              statusHistory: { create: { toStatus: OrderStatus.PENDING } },
              payments: {
                create: {
                  method: dto.paymentMethod ?? PaymentMethod.CASH,
                  amount: total,
                  payerPhone: dto.customerPhone.replace(/\s+/g, ""),
                },
              },
              outboxEvents: {
                create: {
                  type: OutboxEventType.ORDER_CREATED,
                  payload: {
                    reference,
                    customerName: dto.customerName.trim(),
                    customerPhone: dto.customerPhone.replace(/\s+/g, ""),
                    total: total.toString(),
                  },
                },
              },
            },
            include: { items: true, payments: true },
          });
          const admins = await tx.user.findMany({
            where: { role: UserRole.ADMIN, isActive: true },
            select: { id: true },
          });
          if (admins.length)
            await tx.inAppNotification.createMany({
              data: admins.map((admin) => ({
                userId: admin.id,
                type: "ORDER_CREATED",
                title: "Nouvelle commande",
                body: `${reference} — ${total.toString()} FCFA`,
                data: { orderId: order.id, reference },
              })),
            });
          return order;
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        const duplicate = await this.findByIdempotencyKey(idempotencyKey);
        if (duplicate) {
          if (duplicate.customerId !== customerId) {
            throw new ConflictException(
              "Cette clé de commande est déjà utilisée.",
            );
          }
          return duplicate;
        }
      }
      throw error;
    }
  }

  async list(query: ListOrdersQueryDto) {
    const search = query.search?.trim();
    const where: Prisma.OrderWhereInput = {
      ...(query.status && { status: query.status }),
      ...((query.from || query.to) && {
        createdAt: {
          ...(query.from && { gte: new Date(query.from) }),
          ...(query.to && { lte: new Date(query.to) }),
        },
      }),
      ...(search && {
        OR: [
          { reference: { contains: search, mode: "insensitive" } },
          { customerName: { contains: search, mode: "insensitive" } },
          { customerPhone: { contains: search } },
        ],
      }),
    };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.order.findMany({
        where,
        orderBy: { createdAt: "desc" },
        include: { items: true, payments: true },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.prisma.order.count({ where }),
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

  async getAdminOrder(id: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        items: true,
        statusHistory: { orderBy: { createdAt: "asc" } },
      },
    });
    if (!order) throw new NotFoundException("Commande introuvable.");
    return order;
  }

  async listMine(customerId: string) {
    return this.prisma.order.findMany({
      where: { customerId },
      orderBy: { createdAt: "desc" },
      include: { items: true, payments: true },
      take: 100,
    });
  }

  async trackMine(reference: string, customerId: string) {
    const order = await this.prisma.order.findFirst({
      where: { reference, customerId },
      select: {
        reference: true,
        status: true,
        fulfillmentType: true,
        deliveryAddress: true,
        deliveryLatitude: true,
        deliveryLongitude: true,
        deliveryInstructions: true,
        requestedFor: true,
        subtotal: true,
        deliveryFee: true,
        total: true,
        createdAt: true,
        updatedAt: true,
        items: {
          select: {
            productName: true,
            quantity: true,
            unitPrice: true,
            lineTotal: true,
          },
        },
        payments: {
          select: { method: true, status: true, amount: true, paidAt: true },
        },
      },
    });
    if (!order) throw new NotFoundException("Commande introuvable.");
    return order;
  }

  async cancelByCustomer(
    reference: string,
    customerId: string,
    dto: CancelOrderDto,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findFirst({
        where: { reference, customerId },
      });
      if (!order) throw new NotFoundException("Commande introuvable.");
      if (order.status !== OrderStatus.PENDING) {
        throw new ConflictException(
          "Cette commande a déjà été prise en charge. Contactez la vendeuse.",
        );
      }
      await tx.payment.updateMany({
        where: { orderId: order.id, status: PaymentStatus.PENDING },
        data: { status: PaymentStatus.CANCELLED },
      });
      await tx.orderStatusHistory.create({
        data: {
          orderId: order.id,
          fromStatus: order.status,
          toStatus: OrderStatus.CANCELLED,
          note: dto.reason?.trim() ?? "Annulation par le client",
        },
      });
      await tx.outboxEvent.create({
        data: {
          type: OutboxEventType.ORDER_STATUS_CHANGED,
          orderId: order.id,
          payload: {
            reference: order.reference,
            customerPhone: order.customerPhone,
            fromStatus: order.status,
            toStatus: OrderStatus.CANCELLED,
          },
        },
      });
      return tx.order.update({
        where: { id: order.id },
        data: { status: OrderStatus.CANCELLED },
        include: { items: true, payments: true },
      });
    });
  }

  async updateStatus(
    id: string,
    dto: UpdateOrderStatusDto,
    actor: AuthenticatedUser,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({ where: { id } });
      if (!order) throw new NotFoundException("Commande introuvable.");
      if (!canTransitionOrder(order.status, dto.status)) {
        throw new ConflictException(
          `Passage de ${order.status} à ${dto.status} impossible.`,
        );
      }
      this.assertRoleCanSetStatus(actor.role, dto.status);
      if (
        dto.status === OrderStatus.OUT_FOR_DELIVERY &&
        order.fulfillmentType === FulfillmentType.PICKUP
      ) {
        throw new ConflictException(
          "Une commande à retirer ne peut pas partir en livraison.",
        );
      }

      await tx.orderStatusHistory.create({
        data: {
          orderId: order.id,
          fromStatus: order.status,
          toStatus: dto.status,
          actorId: actor.id,
          note: dto.note?.trim(),
        },
      });
      await tx.outboxEvent.create({
        data: {
          type: OutboxEventType.ORDER_STATUS_CHANGED,
          orderId: order.id,
          payload: {
            reference: order.reference,
            customerPhone: order.customerPhone,
            fromStatus: order.status,
            toStatus: dto.status,
          },
        },
      });
      if (dto.status === OrderStatus.CANCELLED) {
        await tx.payment.updateMany({
          where: { orderId: order.id, status: PaymentStatus.PENDING },
          data: { status: PaymentStatus.CANCELLED },
        });
      }
      return tx.order.update({
        where: { id },
        data: { status: dto.status },
        include: { items: true, payments: true },
      });
    });
  }

  private validateDelivery(dto: CreateOrderDto): void {
    if (
      dto.fulfillmentType === FulfillmentType.DELIVERY &&
      !dto.deliveryAddress &&
      (dto.deliveryLatitude === undefined ||
        dto.deliveryLongitude === undefined)
    ) {
      throw new BadRequestException(
        "Une adresse ou une position GPS est requise pour la livraison.",
      );
    }
  }

  private assertRoleCanSetStatus(role: UserRole, status: OrderStatus): void {
    if (role === UserRole.ADMIN) return;
    if (
      role === UserRole.DELIVERER &&
      (status === OrderStatus.OUT_FOR_DELIVERY ||
        status === OrderStatus.DELIVERED)
    ) {
      return;
    }
    throw new ForbiddenException(
      "Votre rôle ne permet pas d’appliquer ce statut.",
    );
  }

  private validateDistinctItems(dto: CreateOrderDto): void {
    const ids = dto.items.map((item) => item.productId);
    if (new Set(ids).size !== ids.length) {
      throw new BadRequestException(
        "Un produit ne doit apparaître qu’une seule fois dans le panier.",
      );
    }
  }

  private async assertCapacity(
    tx: Prisma.TransactionClient,
    start: Date,
    end: Date,
    orderLimit: number | null,
    portionLimit: number | null,
    requestedPortions: number,
  ): Promise<void> {
    const activeOrders = {
      requestedFor: { gte: start, lt: end },
      status: { not: OrderStatus.CANCELLED },
    } satisfies Prisma.OrderWhereInput;

    if (orderLimit !== null) {
      const count = await tx.order.count({ where: activeOrders });
      if (count >= orderLimit) {
        throw new ConflictException(
          "La limite de commandes est atteinte pour ce service.",
        );
      }
    }

    if (portionLimit !== null) {
      const items = await tx.orderItem.findMany({
        where: { order: activeOrders },
        select: { quantity: true, portions: true },
      });
      const reserved = items.reduce(
        (sum, item) => sum + item.quantity * item.portions,
        0,
      );
      if (reserved + requestedPortions > portionLimit) {
        throw new ConflictException(
          "Il ne reste pas assez de portions pour ce service.",
        );
      }
    }
  }

  private findByIdempotencyKey(
    idempotencyKey: string,
    client: Prisma.TransactionClient | PrismaService = this.prisma,
  ) {
    return client.order.findUnique({
      where: { idempotencyKey },
      include: { items: true, payments: true },
    });
  }

  private createReference(now: Date): string {
    const date = now.toISOString().slice(0, 10).replace(/-/g, "");
    return `CMD-${date}-${randomBytes(3).toString("hex").toUpperCase()}`;
  }
}
