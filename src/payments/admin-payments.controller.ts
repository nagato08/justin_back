import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
  UseGuards,
} from "@nestjs/common";
import { UserRole } from "@prisma/client";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { AuthenticatedUser } from "../auth/auth.types";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { Roles } from "../auth/decorators/roles.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { ConfirmCashPaymentDto } from "./dto/confirm-cash-payment.dto";
import { ListPaymentsQueryDto } from "./dto/list-payments-query.dto";
import { PaymentsService } from "./payments.service";

@ApiTags("admin/payments")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller("admin/payments")
export class AdminPaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Get()
  @ApiOperation({ summary: "Lister et filtrer les paiements" })
  list(@Query() query: ListPaymentsQueryDto) {
    return this.paymentsService.list(query);
  }

  @Patch(":id/confirm-cash")
  @ApiOperation({ summary: "Confirmer la réception d’espèces" })
  confirmCash(
    @Param("id") id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ConfirmCashPaymentDto,
  ) {
    return this.paymentsService.confirmCash(id, user.id, dto);
  }

  @Patch(":id/refund-cash")
  @ApiOperation({ summary: "Enregistrer un remboursement en espèces" })
  refundCash(
    @Param("id") id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ConfirmCashPaymentDto,
  ) {
    return this.paymentsService.refundCash(id, user.id, dto);
  }
}
