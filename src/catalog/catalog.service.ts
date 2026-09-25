import {
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma, ProductStatus } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { CreateCategoryDto } from "./dto/create-category.dto";
import { CreateProductDto } from "./dto/create-product.dto";
import { UpdateCategoryDto } from "./dto/update-category.dto";
import { UpdateProductDto } from "./dto/update-product.dto";
import { ListProductsQueryDto } from "./dto/list-products-query.dto";

@Injectable()
export class CatalogService {
  constructor(private readonly prisma: PrismaService) {}

  getPublicCatalog() {
    return this.prisma.category.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      include: {
        products: {
          where: { status: ProductStatus.ACTIVE },
          orderBy: { name: "asc" },
          include: {
            images: { orderBy: { sortOrder: "asc" } },
          },
        },
      },
    });
  }

  async getPublicProduct(slug: string) {
    const product = await this.prisma.product.findFirst({
      where: { slug, status: ProductStatus.ACTIVE },
      include: {
        category: true,
        images: { orderBy: { sortOrder: "asc" } },
      },
    });
    if (!product) throw new NotFoundException("Produit introuvable.");
    return product;
  }

  getAdminCategories() {
    return this.prisma.category.findMany({
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      include: { _count: { select: { products: true } } },
    });
  }

  async createCategory(dto: CreateCategoryDto) {
    try {
      return await this.prisma.category.create({
        data: {
          ...dto,
          name: dto.name.trim(),
          slug: dto.slug ?? this.slugify(dto.name),
        },
      });
    } catch (error) {
      this.handleUniqueConstraint(error, "Cette catégorie existe déjà.");
    }
  }

  async updateCategory(id: string, dto: UpdateCategoryDto) {
    await this.ensureCategoryExists(id);
    try {
      return await this.prisma.category.update({
        where: { id },
        data: {
          ...dto,
          ...(dto.name && { name: dto.name.trim() }),
        },
      });
    } catch (error) {
      this.handleUniqueConstraint(error, "Ce nom court est déjà utilisé.");
    }
  }

  async deleteCategory(id: string): Promise<void> {
    const category = await this.prisma.category.findUnique({
      where: { id },
      include: { _count: { select: { products: true } } },
    });
    if (!category) throw new NotFoundException("Catégorie introuvable.");
    if (category._count.products > 0) {
      throw new ConflictException(
        "Désactivez cette catégorie ou déplacez ses produits avant de la supprimer.",
      );
    }
    await this.prisma.category.delete({ where: { id } });
  }

  async getAdminProducts(query: ListProductsQueryDto) {
    const search = query.search?.trim();
    const where: Prisma.ProductWhereInput = {
      ...(query.status && { status: query.status }),
      ...(query.categoryId && { categoryId: query.categoryId }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: "insensitive" } },
          { description: { contains: search, mode: "insensitive" } },
        ],
      }),
    };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.product.findMany({
        where,
        orderBy: { createdAt: "desc" },
        include: {
          category: true,
          images: { orderBy: { sortOrder: "asc" } },
        },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.prisma.product.count({ where }),
    ]);
    return {
      data,
      meta: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }

  async getAdminProduct(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        category: true,
        images: { orderBy: { sortOrder: "asc" } },
      },
    });
    if (!product) throw new NotFoundException("Produit introuvable.");
    return product;
  }

  async createProduct(dto: CreateProductDto) {
    await this.ensureCategoryExists(dto.categoryId);
    const { imageUrls, imageUrl, ...productData } = dto;
    const gallery = this.normalizeImageUrls(
      imageUrls ?? (imageUrl ? [imageUrl] : []),
    );

    try {
      return await this.prisma.product.create({
        data: {
          ...productData,
          name: dto.name.trim(),
          slug: dto.slug ?? this.slugify(dto.name),
          price: new Prisma.Decimal(dto.price),
          imageUrl: gallery[0] ?? null,
          ...(gallery.length > 0 && {
            images: {
              create: gallery.map((url, sortOrder) => ({ url, sortOrder })),
            },
          }),
        },
        include: {
          category: true,
          images: { orderBy: { sortOrder: "asc" } },
        },
      });
    } catch (error) {
      this.handleUniqueConstraint(error, "Ce produit existe déjà.");
    }
  }

  async updateProduct(id: string, dto: UpdateProductDto) {
    await this.ensureProductExists(id);
    if (dto.categoryId) await this.ensureCategoryExists(dto.categoryId);

    const { imageUrls, ...productData } = dto;
    const gallery =
      imageUrls === undefined ? undefined : this.normalizeImageUrls(imageUrls);

    try {
      return await this.prisma.product.update({
        where: { id },
        data: {
          ...productData,
          ...(dto.name && { name: dto.name.trim() }),
          ...(dto.price !== undefined && {
            price: new Prisma.Decimal(dto.price),
          }),
          ...(gallery !== undefined && {
            imageUrl: gallery[0] ?? null,
            images: {
              deleteMany: {},
              ...(gallery.length > 0 && {
                create: gallery.map((url, sortOrder) => ({ url, sortOrder })),
              }),
            },
          }),
        },
        include: {
          category: true,
          images: { orderBy: { sortOrder: "asc" } },
        },
      });
    } catch (error) {
      this.handleUniqueConstraint(error, "Ce nom court est déjà utilisé.");
    }
  }

  async archiveProduct(id: string) {
    await this.ensureProductExists(id);
    return this.prisma.product.update({
      where: { id },
      data: { status: ProductStatus.ARCHIVED },
    });
  }

  private normalizeImageUrls(urls: string[]): string[] {
    return [...new Set(urls.map((url) => url.trim()).filter(Boolean))];
  }

  private async ensureCategoryExists(id: string): Promise<void> {
    const category = await this.prisma.category.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!category) throw new NotFoundException("Catégorie introuvable.");
  }

  private async ensureProductExists(id: string): Promise<void> {
    const product = await this.prisma.product.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!product) throw new NotFoundException("Produit introuvable.");
  }

  private slugify(value: string): string {
    return value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  }

  private handleUniqueConstraint(error: unknown, message: string): never {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new ConflictException(message);
    }
    throw error;
  }
}
