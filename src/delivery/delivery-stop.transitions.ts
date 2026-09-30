import { DeliveryStopStatus } from "@prisma/client";

const TRANSITIONS: Record<DeliveryStopStatus, readonly DeliveryStopStatus[]> = {
  PENDING: [DeliveryStopStatus.ARRIVED, DeliveryStopStatus.SKIPPED],
  ARRIVED: [DeliveryStopStatus.DELIVERED, DeliveryStopStatus.SKIPPED],
  DELIVERED: [],
  SKIPPED: [],
};

export function canTransitionDeliveryStop(
  from: DeliveryStopStatus,
  to: DeliveryStopStatus,
): boolean {
  return TRANSITIONS[from].includes(to);
}
