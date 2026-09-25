import { ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsBoolean,
  IsInt,
  IsISO8601,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from "class-validator";

export class UpdateStoreSettingsDto {
  @ApiPropertyOptional({ example: "Les Délices de Grâce" })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  businessName?: string;

  @ApiPropertyOptional({ example: "18:00" })
  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/)
  ordersOpenAt?: string;

  @ApiPropertyOptional({ example: "09:00" })
  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/)
  ordersCloseAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isManuallyClosed?: boolean;

  @ApiPropertyOptional({ example: "Capacité atteinte pour aujourd’hui" })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  manualClosureReason?: string | null;

  @ApiPropertyOptional({ example: "2026-09-22T18:00:00+01:00" })
  @IsOptional()
  @IsISO8601()
  nextOpeningAt?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  allowPreorders?: boolean;

  @ApiPropertyOptional({ minimum: 1, maximum: 1000 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1000)
  dailyOrderLimit?: number | null;

  @ApiPropertyOptional({ minimum: 1, maximum: 10000 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10000)
  dailyPortionLimit?: number | null;

  @ApiPropertyOptional({ example: 1000, minimum: 500 })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(500)
  @Max(1000000)
  defaultDeliveryFee?: number;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  mobileMoneyEnabled?: boolean;
}
