import { Body, Controller, Get, Post } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { Prisma } from "@prisma/client";
import { StoreSettingsService } from "../store-settings/store-settings.service";
import { DeliveryService } from "./delivery.service";
import { DeliveryQuoteDto } from "./dto/delivery-quote.dto";

@ApiTags("delivery")
@Controller("delivery")
export class DeliveryController {
  constructor(
    private readonly deliveryService: DeliveryService,
    private readonly storeSettings: StoreSettingsService,
  ) {}

  @Get("zones")
  @ApiOperation({ summary: "Lister les zones de livraison actives" })
  listZones() {
    return this.deliveryService.listPublicZones();
  }

  @Post("quote")
  @ApiOperation({ summary: "Calculer les frais pour une position GPS" })
  async quote(@Body() dto: DeliveryQuoteDto) {
    const settings = await this.storeSettings.getSettings();
    return this.deliveryService.quote(
      dto.latitude,
      dto.longitude,
      new Prisma.Decimal(settings.defaultDeliveryFee),
    );
  }
}
