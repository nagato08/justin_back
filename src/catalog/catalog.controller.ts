import { Controller, Get, Param } from "@nestjs/common";
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

  @Get("products/:slug")
  @ApiOperation({ summary: "Afficher le détail public d’un produit" })
  getProduct(@Param("slug") slug: string) {
    return this.catalogService.getPublicProduct(slug);
  }
}
