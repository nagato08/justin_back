import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsBoolean,
  IsInt,
  IsLatitude,
  IsLongitude,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from "class-validator";

export class CreateDeliveryZoneDto {
  @ApiProperty({ example: "Bonamoussadi" })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name: string;

  @ApiProperty({ example: 4.089 })
  @IsLatitude()
  centerLat: number;

  @ApiProperty({ example: 9.735 })
  @IsLongitude()
  centerLng: number;

  @ApiProperty({ example: 5, minimum: 0.1 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.1)
  @Max(200)
  radiusKm: number;

  @ApiProperty({ example: 1000, minimum: 500 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(500)
  @Max(1000000)
  fee: number;

  @ApiPropertyOptional({ example: 30 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1440)
  estimatedMin?: number;

  @ApiPropertyOptional({ example: 60 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1440)
  estimatedMax?: number;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1000)
  sortOrder?: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
