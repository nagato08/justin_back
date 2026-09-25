import { ApiPropertyOptional } from "@nestjs/swagger";
import { PaymentMethod, PaymentStatus } from "@prisma/client";
import { IsEnum, IsOptional } from "class-validator";
import { PaginationQueryDto } from "../../common/dto/pagination-query.dto";

export class ListPaymentsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: PaymentStatus })
  @IsOptional()
  @IsEnum(PaymentStatus)
  status?: PaymentStatus;

  @ApiPropertyOptional({ enum: PaymentMethod })
  @IsOptional()
  @IsEnum(PaymentMethod)
  method?: PaymentMethod;
}
