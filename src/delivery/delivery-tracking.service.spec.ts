import { ConflictException } from "@nestjs/common";
import {
  DeliveryAssignmentStatus,
  DeliveryStopStatus,
  OrderStatus,
} from "@prisma/client";
import { DeliveryTrackingService } from "./delivery-tracking.service";

function assignedStop(orderStatus: OrderStatus) {
  return {
    id: "stop-1",
    assignmentId: "assignment-1",
    orderId: "order-1",
    sequence: 1,
    status: DeliveryStopStatus.ARRIVED,
    arrivedAt: new Date(),
    deliveredAt: null,
    assignment: { status: DeliveryAssignmentStatus.IN_PROGRESS },
    order: {
      id: "order-1",
      status: orderStatus,
      reference: "CMD-1",
      customerPhone: "+237600000000",
    },
  };
}

describe("DeliveryTrackingService.updateStop", () => {
  it("refuse de livrer une commande annulée", async () => {
    const tx = {
      deliveryStop: {
        findFirst: jest
          .fn()
          .mockResolvedValue(assignedStop(OrderStatus.CANCELLED)),
        updateMany: jest.fn(),
      },
    };
    const prisma = {
      $transaction: jest.fn((callback: (client: typeof tx) => unknown) =>
        callback(tx),
      ),
    };
    const service = new DeliveryTrackingService(prisma as never);

    await expect(
      service.updateStop("stop-1", "driver-1", DeliveryStopStatus.DELIVERED),
    ).rejects.toThrow(ConflictException);
    expect(tx.deliveryStop.updateMany).not.toHaveBeenCalled();
  });

  it("met à jour atomiquement une livraison valide", async () => {
    const stop = assignedStop(OrderStatus.OUT_FOR_DELIVERY);
    const tx = {
      deliveryStop: {
        findFirst: jest.fn().mockResolvedValue(stop),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        count: jest.fn().mockResolvedValue(0),
        findUniqueOrThrow: jest.fn().mockResolvedValue({
          ...stop,
          status: DeliveryStopStatus.DELIVERED,
        }),
      },
      order: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      orderStatusHistory: { create: jest.fn().mockResolvedValue({}) },
      outboxEvent: { create: jest.fn().mockResolvedValue({}) },
      deliveryAssignment: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
    };
    const prisma = {
      $transaction: jest.fn((callback: (client: typeof tx) => unknown) =>
        callback(tx),
      ),
    };
    const service = new DeliveryTrackingService(prisma as never);

    await service.updateStop(
      "stop-1",
      "driver-1",
      DeliveryStopStatus.DELIVERED,
    );

    expect(tx.order.updateMany).toHaveBeenCalledWith({
      where: {
        id: "order-1",
        status: OrderStatus.OUT_FOR_DELIVERY,
      },
      data: { status: OrderStatus.DELIVERED },
    });
    expect(tx.orderStatusHistory.create).toHaveBeenCalled();
    expect(tx.outboxEvent.create).toHaveBeenCalled();
  });
});
