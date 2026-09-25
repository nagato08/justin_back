import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString, MaxLength } from "class-validator";

export class ConfirmCashPaymentDto {
  @ApiPropertyOptional({ example: "Espèces reçues à la livraison" })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  note?: string;
}
