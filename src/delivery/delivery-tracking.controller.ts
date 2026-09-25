import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from "@nestjs/common";
import { UserRole } from "@prisma/client";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { AuthenticatedUser } from "../auth/auth.types";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { Roles } from "../auth/decorators/roles.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { DeliveryTrackingService } from "./delivery-tracking.service";
import {
  CreateDeliveryAssignmentDto,
  UpdateDeliveryStopDto,
} from "./dto/delivery-assignment.dto";

@ApiTags("delivery-tracking")
@Controller()
export class DeliveryTrackingController {
  constructor(private readonly tracking: DeliveryTrackingService) {}

  @Get("delivery/tracking/:reference")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.CUSTOMER)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Dernière position du livreur de ma commande" })
  customerTracking(
    @Param("reference") reference: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.tracking.customerTracking(reference, user.id);
  }

  @Get("admin/delivery/assignments")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  list() {
    return this.tracking.listAssignments();
  }

  @Post("admin/delivery/assignments")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  create(@Body() dto: CreateDeliveryAssignmentDto) {
    return this.tracking.createAssignment(dto);
  }

  @Get("driver/delivery/assignments")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.DELIVERER)
  @ApiBearerAuth()
  driverAssignments(@CurrentUser() user: AuthenticatedUser) {
    return this.tracking.getDriverAssignments(user.id);
  }

  @Patch("driver/delivery/assignments/:id/start")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.DELIVERER)
  @ApiBearerAuth()
  start(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.tracking.start(id, user.id);
  }

  @Patch("driver/delivery/stops/:id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.DELIVERER)
  @ApiBearerAuth()
  updateStop(
    @Param("id") id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateDeliveryStopDto,
  ) {
    return this.tracking.updateStop(id, user.id, dto.status);
  }
}
