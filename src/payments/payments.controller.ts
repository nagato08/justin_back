import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import {
  InitiatePawaPayDto,
  PawaPayCallbackDto,
} from "./dto/initiate-pawapay.dto";
import { PaymentsService } from "./payments.service";
import { UserRole } from "@prisma/client";
import { AuthenticatedUser } from "../auth/auth.types";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { Roles } from "../auth/decorators/roles.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";

@ApiTags("payments")
@Controller("payments/pawapay")
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  @Get("providers")
  @ApiOperation({ summary: "Obtenir les opérateurs activés dans PawaPay" })
  providers() {
    return this.payments.getPawaPayConfiguration();
  }

  @Post("deposits")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.CUSTOMER)
  @ApiBearerAuth()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiOperation({ summary: "Lancer le paiement Mobile Money d’une commande" })
  initiate(
    @Body() dto: InitiatePawaPayDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.payments.initiatePawaPay(dto, user.id);
  }

  @Post("callback")
  @HttpCode(200)
  @ApiOperation({
    summary: "Callback PawaPay; le statut est revérifié auprès de PawaPay",
  })
  callback(@Body() dto: PawaPayCallbackDto) {
    return this.payments.reconcilePawaPay(dto.depositId);
  }
}
