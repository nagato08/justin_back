import {
  Controller,
  Get,
  Headers,
  Param,
  Patch,
  Post,
  Body,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiHeader,
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger";
import { CreateOrderDto } from "./dto/create-order.dto";
import { OrdersService } from "./orders.service";
import { CancelOrderDto } from "./dto/cancel-order.dto";
import { UserRole } from "@prisma/client";
import { AuthenticatedUser } from "../auth/auth.types";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { Roles } from "../auth/decorators/roles.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";

@ApiTags("orders")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.CUSTOMER)
@Controller("orders")
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @ApiHeader({
    name: "Idempotency-Key",
    required: true,
    description: "Identifiant unique généré une fois par validation du panier",
  })
  @ApiOperation({ summary: "Passer une commande ou une précommande" })
  create(
    @Body() dto: CreateOrderDto,
    @Headers("idempotency-key") idempotencyKey: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.ordersService.create(dto, idempotencyKey, user.id);
  }

  @Get("me")
  @ApiOperation({ summary: "Lister mes commandes" })
  listMine(@CurrentUser() user: AuthenticatedUser) {
    return this.ordersService.listMine(user.id);
  }

  @Get(":reference/status")
  @ApiOperation({
    summary: "Suivre une commande appartenant au compte connecté",
  })
  track(
    @Param("reference") reference: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.ordersService.trackMine(reference, user.id);
  }

  @Patch(":reference/cancel")
  @ApiOperation({ summary: "Annuler une commande encore en attente" })
  cancel(
    @Param("reference") reference: string,
    @Body() dto: CancelOrderDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.ordersService.cancelByCustomer(reference, user.id, dto);
  }
}
