import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsString, MaxLength, MinLength } from "class-validator";

export class RegisterDto {
  @ApiProperty({ example: "client@example.com" })
  @IsEmail()
  email: string;

  @ApiProperty({ example: "Grâce M." })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  displayName: string;

  @ApiProperty({ minLength: 6 })
  @IsString()
  @MinLength(6)
  @MaxLength(128)
  password: string;
}
