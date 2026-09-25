import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { APP_GUARD } from "@nestjs/core";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { ScheduleModule } from "@nestjs/schedule";
import { DeliveryModule } from "./delivery/delivery.module";
import { AuthModule } from "./auth/auth.module";
import { CatalogModule } from "./catalog/catalog.module";
import { HealthModule } from "./health/health.module";
import { MediaModule } from "./media/media.module";
import { OrdersModule } from "./orders/orders.module";
import { NotificationsModule } from "./notifications/notifications.module";
import { PaymentsModule } from "./payments/payments.module";
import { PrismaModule } from "./prisma/prisma.module";
import { ReportsModule } from "./reports/reports.module";
import { StoreSettingsModule } from "./store-settings/store-settings.module";
import { UsersModule } from "./users/users.module";
import { validateEnvironment } from "./config/validate-environment";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnvironment }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }]),
    ScheduleModule.forRoot(),
    DeliveryModule,
    PrismaModule,
    ReportsModule,
    AuthModule,
    CatalogModule,
    OrdersModule,
    PaymentsModule,
    NotificationsModule,
    HealthModule,
    MediaModule,
    StoreSettingsModule,
    UsersModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
