import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { DeliveryModule } from "../delivery/delivery.module";
import { StoreSettingsModule } from "../store-settings/store-settings.module";
import { AdminOrdersController } from "./admin-orders.controller";
import { OrdersController } from "./orders.controller";
import { OrdersService } from "./orders.service";

@Module({
  imports: [AuthModule, StoreSettingsModule, DeliveryModule],
  controllers: [OrdersController, AdminOrdersController],
  providers: [OrdersService],
})
export class OrdersModule {}
