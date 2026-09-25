import { OrderStatus } from "@prisma/client";
import { canTransitionOrder } from "./order-status.transitions";

describe("canTransitionOrder", () => {
  it("autorise le cycle normal de préparation", () => {
    expect(canTransitionOrder(OrderStatus.PENDING, OrderStatus.CONFIRMED)).toBe(
      true,
    );
    expect(
      canTransitionOrder(OrderStatus.CONFIRMED, OrderStatus.PREPARING),
    ).toBe(true);
    expect(canTransitionOrder(OrderStatus.PREPARING, OrderStatus.READY)).toBe(
      true,
    );
  });

  it("interdit de revenir en arrière et de modifier un état final", () => {
    expect(canTransitionOrder(OrderStatus.READY, OrderStatus.PREPARING)).toBe(
      false,
    );
    expect(
      canTransitionOrder(OrderStatus.DELIVERED, OrderStatus.CANCELLED),
    ).toBe(false);
    expect(
      canTransitionOrder(OrderStatus.CANCELLED, OrderStatus.CONFIRMED),
    ).toBe(false);
  });
});
