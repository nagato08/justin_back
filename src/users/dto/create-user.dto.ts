import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { UserRole } from "@prisma/client";
import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from "class-validator";

export class CreateUserDto {
  @ApiProperty({ example: "employe@example.com" })
  @IsEmail()
  email: string;

  @ApiProperty({ example: "Marie" })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  displayName: string;

  @ApiPropertyOptional({
    minLength: 6,
    description: "Facultatif si le livreur utilisera Google",
  })
  @IsOptional()
  @IsString()
  @MinLength(6)
  @MaxLength(128)
  password?: string;

  @ApiPropertyOptional({ enum: UserRole, default: UserRole.DELIVERER })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;
}
