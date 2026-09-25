import { ApiProperty } from "@nestjs/swagger";
import { IsString, MaxLength, MinLength } from "class-validator";

export class ResetPasswordDto {
  @ApiProperty({ minLength: 6 })
  @IsString()
  @MinLength(6)
  @MaxLength(128)
  password: string;
}
