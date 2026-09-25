import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { StoreSettingsController } from "./store-settings.controller";
import { StoreSettingsService } from "./store-settings.service";

@Module({
  imports: [AuthModule],
  controllers: [StoreSettingsController],
  providers: [StoreSettingsService],
  exports: [StoreSettingsService],
})
export class StoreSettingsModule {}
