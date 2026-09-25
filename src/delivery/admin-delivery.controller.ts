import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from "@nestjs/common";
import { UserRole } from "@prisma/client";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { Roles } from "../auth/decorators/roles.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { DeliveryService } from "./delivery.service";
import { CreateDeliveryZoneDto } from "./dto/create-delivery-zone.dto";
import { UpdateDeliveryZoneDto } from "./dto/update-delivery-zone.dto";

@ApiTags("admin/delivery")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller("admin/delivery/zones")
export class AdminDeliveryController {
  constructor(private readonly deliveryService: DeliveryService) {}

  @Get()
  @ApiOperation({ summary: "Lister toutes les zones" })
  list() {
    return this.deliveryService.listAdminZones();
  }

  @Post()
  @ApiOperation({ summary: "Créer une zone circulaire" })
  create(@Body() dto: CreateDeliveryZoneDto) {
    return this.deliveryService.create(dto);
  }

  @Patch(":id")
  @ApiOperation({ summary: "Modifier une zone" })
  update(@Param("id") id: string, @Body() dto: UpdateDeliveryZoneDto) {
    return this.deliveryService.update(id, dto);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Désactiver une zone" })
  remove(@Param("id") id: string) {
    return this.deliveryService.remove(id);
  }
}
