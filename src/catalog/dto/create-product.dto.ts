import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { ProductStatus } from "@prisma/client";
import {
  ArrayMaxSize,
  IsArray,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from "class-validator";

export class CreateProductDto {
  @ApiProperty()
  @IsString()
  categoryId: string;

  @ApiProperty({ example: "Poulet braisé" })
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name: string;

  @ApiPropertyOptional({ example: "poulet-braise" })
  @IsOptional()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  @MaxLength(140)
  slug?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string | null;

  @ApiProperty({ example: 5000, minimum: 0 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(10000000)
  price: number;

  @ApiPropertyOptional({
    example: "/uploads/products/550e8400-e29b-41d4-a716-446655440000.webp",
    description:
      "URL HTTP(S) ou chemin d’image produit téléversée par l’application",
  })
  @IsOptional()
  @Matches(
    /^(?:https?:\/\/[^\s]+|\/uploads\/products\/[a-z0-9-]+\.(?:jpe?g|png|webp))$/i,
    {
      message:
        "imageUrl doit être une URL HTTP(S) ou une image téléversée valide.",
    },
  )
  @MaxLength(500)
  imageUrl?: string | null;

  @ApiPropertyOptional({
    type: [String],
    maxItems: 8,
    description: "Galerie du produit, dans l’ordre d’affichage",
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(8)
  @Matches(
    /^(?:https?:\/\/[^\s]+|\/uploads\/products\/[a-z0-9-]+\.(?:jpe?g|png|webp))$/i,
    {
      each: true,
      message:
        "Chaque image doit être une URL HTTP(S) ou une image téléversée valide.",
    },
  )
  @MaxLength(500, { each: true })
  imageUrls?: string[];

  @ApiPropertyOptional({ default: 1, minimum: 1, maximum: 100 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  portions?: number;

  @ApiPropertyOptional({ enum: ProductStatus, default: ProductStatus.DRAFT })
  @IsOptional()
  @IsEnum(ProductStatus)
  status?: ProductStatus;
}
