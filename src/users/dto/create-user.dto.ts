import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { UserRole } from "@prisma/client";
import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
  ValidateIf,
} from "class-validator";
import { E164_PHONE } from "../../common/phone";

export class CreateUserDto {
  @ApiPropertyOptional({
    example: "employe@example.com",
    description: "E-mail ou téléphone obligatoire",
  })
  @ValidateIf((dto: CreateUserDto) => !dto.phone)
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({
    example: "+237690000000",
    description: "Format international, pour la connexion par OTP",
  })
  @IsOptional()
  @Matches(E164_PHONE, {
    message: "Le téléphone doit être au format international (+237…).",
  })
  phone?: string;

  @ApiProperty({ example: "Marie" })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  displayName: string;

  @ApiPropertyOptional({
    minLength: 8,
    description: "Facultatif si le livreur utilise Google ou le téléphone",
  })
  @IsOptional()
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password?: string;

  @ApiPropertyOptional({ enum: UserRole, default: UserRole.DELIVERER })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;
}
