import { UserRole } from "@prisma/client";
import { ROLES_KEY } from "../auth/decorators/roles.decorator";
import { AdminOrdersController } from "./admin-orders.controller";

describe("AdminOrdersController", () => {
  it("réserve toutes les routes aux administrateurs", () => {
    expect(Reflect.getMetadata(ROLES_KEY, AdminOrdersController)).toEqual([
      UserRole.ADMIN,
    ]);
  });
});
