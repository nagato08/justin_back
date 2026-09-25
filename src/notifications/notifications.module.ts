import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { AdminNotificationsController } from "./admin-notifications.controller";
import { NotificationsService } from "./notifications.service";
import { NotificationsController } from "./notifications.controller";

@Module({
  imports: [AuthModule],
  controllers: [NotificationsController, AdminNotificationsController],
  providers: [NotificationsService],
})
export class NotificationsModule {}
