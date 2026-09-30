import { DeliveryStopStatus } from "@prisma/client";
import { canTransitionDeliveryStop } from "./delivery-stop.transitions";

describe("canTransitionDeliveryStop", () => {
  it("impose une arrivée avant la livraison", () => {
    expect(
      canTransitionDeliveryStop(
        DeliveryStopStatus.PENDING,
        DeliveryStopStatus.DELIVERED,
      ),
    ).toBe(false);
    expect(
      canTransitionDeliveryStop(
        DeliveryStopStatus.PENDING,
        DeliveryStopStatus.ARRIVED,
      ),
    ).toBe(true);
    expect(
      canTransitionDeliveryStop(
        DeliveryStopStatus.ARRIVED,
        DeliveryStopStatus.DELIVERED,
      ),
    ).toBe(true);
  });

  it("rend les statuts terminaux immuables", () => {
    expect(
      canTransitionDeliveryStop(
        DeliveryStopStatus.DELIVERED,
        DeliveryStopStatus.ARRIVED,
      ),
    ).toBe(false);
    expect(
      canTransitionDeliveryStop(
        DeliveryStopStatus.SKIPPED,
        DeliveryStopStatus.ARRIVED,
      ),
    ).toBe(false);
  });
});
