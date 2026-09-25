import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { ProductStatus } from "@prisma/client";
import {
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
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

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl({ require_protocol: true })
  @MaxLength(500)
  imageUrl?: string | null;

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
