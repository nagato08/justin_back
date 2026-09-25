import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsISO8601, IsOptional } from "class-validator";

export class ReportRangeQueryDto {
  @ApiPropertyOptional({
    description: "Début ISO, 30 jours auparavant par défaut",
  })
  @IsOptional()
  @IsISO8601()
  from?: string;

  @ApiPropertyOptional({ description: "Fin ISO, maintenant par défaut" })
  @IsOptional()
  @IsISO8601()
  to?: string;
}
