import { ApiProperty } from "@nestjs/swagger";
import { IsString, IsUUID, Length, MinLength } from "class-validator";

export class InitiatePawaPayDto {
  @ApiProperty()
  @IsString()
  @MinLength(5)
  reference: string;

  @ApiProperty({ example: "MTN_MOMO_CMR" })
  @IsString()
  @MinLength(3)
  provider: string;

  @ApiProperty({ example: "237670000000" })
  @IsString()
  @Length(9, 15)
  phoneNumber: string;
}

export class PawaPayCallbackDto {
  @ApiProperty()
  @IsUUID("4")
  depositId: string;
}
