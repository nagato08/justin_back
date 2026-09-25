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
import { ListOrdersQueryDto } from "./dto/list-orders-query.dto";
import { UpdateOrderStatusDto } from "./dto/update-order-status.dto";
import { OrdersService } from "./orders.service";

@ApiTags("admin/orders")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.DELIVERER)
@Controller("admin/orders")
export class AdminOrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get()
  @ApiOperation({ summary: "Lister les commandes" })
  list(@Query() query: ListOrdersQueryDto) {
    return this.ordersService.list(query);
  }

  @Get(":id")
  @ApiOperation({ summary: "Afficher une commande et son historique" })
  getOne(@Param("id") id: string) {
    return this.ordersService.getAdminOrder(id);
  }

  @Patch(":id/status")
  @ApiOperation({ summary: "Faire avancer le statut d’une commande" })
  updateStatus(
    @Param("id") id: string,
    @Body() dto: UpdateOrderStatusDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.ordersService.updateStatus(id, dto, user);
  }
}
