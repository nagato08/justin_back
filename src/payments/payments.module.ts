import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { AdminPaymentsController } from "./admin-payments.controller";
import { PaymentsService } from "./payments.service";
import { PaymentsController } from "./payments.controller";
import { PawaPayClient } from "./pawapay.client";

@Module({
  imports: [AuthModule],
  controllers: [PaymentsController, AdminPaymentsController],
  providers: [PaymentsService, PawaPayClient],
})
export class PaymentsModule {}
