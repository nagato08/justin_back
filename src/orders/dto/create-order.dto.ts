import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { FulfillmentType, PaymentMethod } from "@prisma/client";
import { Type } from "class-transformer";
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsISO8601,
  IsLatitude,
  IsLongitude,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
  ValidateNested,
} from "class-validator";
import { CreateOrderItemDto } from "./create-order-item.dto";

export class CreateOrderDto {
  @ApiProperty({ example: "Grâce M." })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  customerName: string;

  @ApiProperty({ example: "+237 699 00 00 00" })
  @Matches(/^\+?[0-9 ]{8,20}$/)
  customerPhone: string;

  @ApiProperty({ enum: FulfillmentType })
  @IsEnum(FulfillmentType)
  fulfillmentType: FulfillmentType;

  @ApiPropertyOptional({ enum: PaymentMethod, default: PaymentMethod.CASH })
  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(300)
  deliveryAddress?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsLatitude()
  deliveryLatitude?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsLongitude()
  deliveryLongitude?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  deliveryInstructions?: string;

  @ApiPropertyOptional({ example: "2026-09-22T19:00:00+01:00" })
  @IsOptional()
  @IsISO8601()
  requestedFor?: string;

  @ApiProperty({ type: [CreateOrderItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(30)
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items: CreateOrderItemDto[];
}
