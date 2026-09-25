import { Controller, Get } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { CatalogService } from "./catalog.service";

@ApiTags("catalog")
@Controller("catalog")
export class CatalogController {
  constructor(private readonly catalogService: CatalogService) {}

  @Get()
  @ApiOperation({ summary: "Afficher le menu public disponible" })
  getCatalog() {
    return this.catalogService.getPublicCatalog();
  }
}
