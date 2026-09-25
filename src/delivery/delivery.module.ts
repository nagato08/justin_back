import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { StoreSettingsModule } from "../store-settings/store-settings.module";
import { AdminDeliveryController } from "./admin-delivery.controller";
import { DeliveryController } from "./delivery.controller";
import { DeliveryService } from "./delivery.service";
import { DeliveryTrackingService } from "./delivery-tracking.service";
import { DeliveryTrackingController } from "./delivery-tracking.controller";
import { DeliveryGateway } from "./delivery.gateway";

@Module({
  imports: [AuthModule, StoreSettingsModule],
  controllers: [
    DeliveryController,
    AdminDeliveryController,
    DeliveryTrackingController,
  ],
  providers: [DeliveryService, DeliveryTrackingService, DeliveryGateway],
  exports: [DeliveryService, DeliveryTrackingService],
})
export class DeliveryModule {}
