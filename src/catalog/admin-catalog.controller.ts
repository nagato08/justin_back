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
  Query,
  UseGuards,
} from "@nestjs/common";
import { UserRole } from "@prisma/client";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { Roles } from "../auth/decorators/roles.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { CatalogService } from "./catalog.service";
import { CreateCategoryDto } from "./dto/create-category.dto";
import { CreateProductDto } from "./dto/create-product.dto";
import { UpdateCategoryDto } from "./dto/update-category.dto";
import { UpdateProductDto } from "./dto/update-product.dto";
import { ListProductsQueryDto } from "./dto/list-products-query.dto";

@ApiTags("admin/catalog")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller("admin/catalog")
export class AdminCatalogController {
  constructor(private readonly catalogService: CatalogService) {}

  @Get("categories")
  @ApiOperation({ summary: "Lister toutes les catégories" })
  getCategories() {
    return this.catalogService.getAdminCategories();
  }

  @Post("categories")
  @ApiOperation({ summary: "Créer une catégorie" })
  createCategory(@Body() dto: CreateCategoryDto) {
    return this.catalogService.createCategory(dto);
  }

  @Patch("categories/:id")
  @ApiOperation({ summary: "Modifier une catégorie" })
  updateCategory(@Param("id") id: string, @Body() dto: UpdateCategoryDto) {
    return this.catalogService.updateCategory(id, dto);
  }

  @Delete("categories/:id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Supprimer une catégorie vide" })
  deleteCategory(@Param("id") id: string) {
    return this.catalogService.deleteCategory(id);
  }

  @Get("products")
  @ApiOperation({ summary: "Lister tous les produits" })
  getProducts(@Query() query: ListProductsQueryDto) {
    return this.catalogService.getAdminProducts(query);
  }

  @Post("products")
  @ApiOperation({ summary: "Créer un produit" })
  createProduct(@Body() dto: CreateProductDto) {
    return this.catalogService.createProduct(dto);
  }

  @Patch("products/:id")
  @ApiOperation({ summary: "Modifier un produit" })
  updateProduct(@Param("id") id: string, @Body() dto: UpdateProductDto) {
    return this.catalogService.updateProduct(id, dto);
  }

  @Delete("products/:id")
  @ApiOperation({ summary: "Archiver un produit" })
  archiveProduct(@Param("id") id: string) {
    return this.catalogService.archiveProduct(id);
  }
}
