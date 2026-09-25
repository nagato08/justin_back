import { ApiPropertyOptional } from "@nestjs/swagger";
import { OrderStatus } from "@prisma/client";
import {
  IsEnum,
  IsISO8601,
  IsOptional,
  IsString,
  MaxLength,
} from "class-validator";
import { PaginationQueryDto } from "../../common/dto/pagination-query.dto";

export class ListOrdersQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: OrderStatus })
  @IsOptional()
  @IsEnum(OrderStatus)
  status?: OrderStatus;

  @ApiPropertyOptional({ description: "Référence, nom ou téléphone" })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsISO8601()
  from?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsISO8601()
  to?: string;
}
