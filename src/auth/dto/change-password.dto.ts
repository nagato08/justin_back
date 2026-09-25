import { ApiProperty } from "@nestjs/swagger";
import { IsString, MaxLength, MinLength } from "class-validator";

export class ChangePasswordDto {
  @ApiProperty()
  @IsString()
  @MinLength(6)
  @MaxLength(128)
  currentPassword: string;

  @ApiProperty({ minLength: 6 })
  @IsString()
  @MinLength(6)
  @MaxLength(128)
  newPassword: string;
}
