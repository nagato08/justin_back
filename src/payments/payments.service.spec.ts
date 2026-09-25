import { ConflictException } from "@nestjs/common";
import {
  FulfillmentType,
  OrderSource,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  Prisma,
} from "@prisma/client";
import { PaymentsService } from "./payments.service";

describe("PaymentsService", () => {
  const order = {
    id: "order-1",
    reference: "CMD-20260921-A1B2C3",
    customerPhone: "+237699000000",
    customerName: "Grâce",
    status: OrderStatus.DELIVERED,
    source: OrderSource.WEB,
    fulfillmentType: FulfillmentType.DELIVERY,
    deliveryAddress: null,
    deliveryLatitude: null,
    deliveryLongitude: null,
    deliveryInstructions: null,
    subtotal: new Prisma.Decimal(5000),
    deliveryFee: new Prisma.Decimal(1000),
    total: new Prisma.Decimal(6000),
    requestedFor: new Date(),
    idempotencyKey: "unique-idempotency-key",
    trackingToken: "tracking-token",
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  it("confirme un paiement en espèces et produit un événement", async () => {
    const payment = {
      id: "payment-1",
      orderId: order.id,
      order,
      method: PaymentMethod.CASH,
      status: PaymentStatus.PENDING,
      amount: order.total,
      currency: "XAF",
    };
    const tx = {
      payment: {
        findUnique: jest.fn().mockResolvedValue(payment),
        update: jest.fn().mockResolvedValue({
          ...payment,
          status: PaymentStatus.SUCCEEDED,
        }),
      },
      outboxEvent: { create: jest.fn().mockResolvedValue({}) },
    };
    const prisma = {
      $transaction: jest.fn((callback: (client: typeof tx) => unknown) =>
        callback(tx),
      ),
    };
    const service = new PaymentsService(prisma as never, {} as never);

    const result = await service.confirmCash(payment.id, "admin-1", {});

    expect(result.status).toBe(PaymentStatus.SUCCEEDED);
    expect(tx.outboxEvent.create).toHaveBeenCalledTimes(1);
    expect(tx.payment.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ confirmedById: "admin-1" }) as object,
      }),
    );
  });

  it("refuse la confirmation manuelle d’un paiement Mobile Money", async () => {
    const tx = {
      payment: {
        findUnique: jest.fn().mockResolvedValue({
          id: "payment-1",
          method: PaymentMethod.MOBILE_MONEY,
          status: PaymentStatus.PENDING,
          order,
        }),
      },
    };
    const prisma = {
      $transaction: jest.fn((callback: (client: typeof tx) => unknown) =>
        callback(tx),
      ),
    };
    const service = new PaymentsService(prisma as never, {} as never);

    await expect(
      service.confirmCash("payment-1", "admin-1", {}),
    ).rejects.toThrow(ConflictException);
  });

  it("confirme un dépôt PawaPay seulement après réconciliation", async () => {
    const payment = {
      id: "payment-mobile-1",
      orderId: order.id,
      order,
      method: PaymentMethod.MOBILE_MONEY,
      status: PaymentStatus.PROCESSING,
      amount: order.total,
      currency: "XAF",
      providerReference: "c5f89af0-07da-4f92-982f-976cd1b1469e",
    };
    const tx = {
      payment: {
        update: jest.fn().mockResolvedValue({
          ...payment,
          status: PaymentStatus.SUCCEEDED,
        }),
      },
      outboxEvent: { create: jest.fn().mockResolvedValue({}) },
    };
    const prisma = {
      payment: { findUnique: jest.fn().mockResolvedValue(payment) },
      $transaction: jest.fn((callback: (client: typeof tx) => unknown) =>
        callback(tx),
      ),
    };
    const pawapay = {
      getDeposit: jest
        .fn()
        .mockResolvedValue({ status: "FOUND", data: { status: "COMPLETED" } }),
    };
    const service = new PaymentsService(prisma as never, pawapay as never);

    const result = await service.reconcilePawaPay(payment.providerReference);

    expect(result.payment.status).toBe(PaymentStatus.SUCCEEDED);
    expect(tx.outboxEvent.create).toHaveBeenCalledTimes(1);
  });
});
