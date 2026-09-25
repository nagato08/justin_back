import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { UserRole } from "@prisma/client";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { Roles } from "../auth/decorators/roles.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { AuthenticatedUser } from "../auth/auth.types";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { ListOutboxQueryDto } from "./dto/list-outbox-query.dto";
import { NotificationsService } from "./notifications.service";
import { PushSubscriptionDto } from "./dto/push-subscription.dto";

@ApiTags("admin/notifications")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller("admin/notifications")
export class AdminNotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get("events")
  @ApiOperation({ summary: "Lister les événements de notification à envoyer" })
  listEvents(@Query() query: ListOutboxQueryDto) {
    return this.notificationsService.listEvents(query);
  }

  @Get("in-app")
  @ApiOperation({
    summary: "Lister le centre de notifications et le nombre non lu",
  })
  listInApp(
    @CurrentUser() user: AuthenticatedUser,
    @Query("unreadOnly") unreadOnly?: string,
  ) {
    return this.notificationsService.listInApp(user.id, unreadOnly === "true");
  }

  @Patch("in-app/read-all")
  markAllRead(@CurrentUser() user: AuthenticatedUser) {
    return this.notificationsService.markAllRead(user.id);
  }

  @Patch("in-app/:id/read")
  markRead(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.notificationsService.markRead(user.id, id);
  }

  @Post("push/subscription")
  @ApiOperation({ summary: "Abonner cet appareil aux nouvelles commandes" })
  subscribeAdmin(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: PushSubscriptionDto,
  ) {
    return this.notificationsService.subscribeAdmin(user, dto);
  }
}
