import { Body, Controller, Get, Patch, UseGuards } from "@nestjs/common";
import { UserRole } from "@prisma/client";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { Roles } from "../auth/decorators/roles.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { UpdateStoreSettingsDto } from "./dto/update-store-settings.dto";
import { StoreSettingsService } from "./store-settings.service";

@ApiTags("store")
@Controller("store")
export class StoreSettingsController {
  constructor(private readonly service: StoreSettingsService) {}

  @Get("status")
  @ApiOperation({ summary: "Obtenir le statut public des commandes" })
  async getPublicStatus() {
    const settings = await this.service.getSettings();
    return this.service.getPublicStatus(settings);
  }

  @Get("settings")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Obtenir la configuration de la boutique" })
  getSettings() {
    return this.service.getSettings();
  }

  @Patch("settings")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Modifier les horaires ou fermer les commandes" })
  update(@Body() dto: UpdateStoreSettingsDto) {
    return this.service.update(dto);
  }
}
