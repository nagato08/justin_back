import { ApiPropertyOptional } from "@nestjs/swagger";
import { OutboxStatus } from "@prisma/client";
import { IsEnum, IsOptional } from "class-validator";

export class ListOutboxQueryDto {
  @ApiPropertyOptional({ enum: OutboxStatus })
  @IsOptional()
  @IsEnum(OutboxStatus)
  status?: OutboxStatus;
}
