import { Body, Controller, Delete, Get, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { SubscribeOrderDto } from "./dto/subscribe-order.dto";
import { UnsubscribeDto } from "./dto/unsubscribe.dto";
import { NotificationsService } from "./notifications.service";
import { UserRole } from "@prisma/client";
import { AuthenticatedUser } from "../auth/auth.types";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { Roles } from "../auth/decorators/roles.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";

@ApiTags("notifications")
@Controller("notifications/push")
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get("public-key")
  @ApiOperation({ summary: "Obtenir la clé publique Web Push" })
  getPublicKey() {
    return this.notificationsService.getPublicKey();
  }

  @Post("subscribe-order")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.CUSTOMER)
  @ApiBearerAuth()
  @ApiOperation({ summary: "S’abonner au suivi Push d’une commande" })
  subscribeOrder(
    @Body() dto: SubscribeOrderDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.notificationsService.subscribeOrder(dto, user.id);
  }

  @Delete("subscription")
  @ApiOperation({ summary: "Désactiver un abonnement Push" })
  unsubscribe(@Body() dto: UnsubscribeDto) {
    return this.notificationsService.unsubscribe(dto.endpoint);
  }
}
