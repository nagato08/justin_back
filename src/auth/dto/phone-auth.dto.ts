import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString, MaxLength, MinLength } from "class-validator";

export class PhoneAuthDto {
  @ApiProperty({
    description: "Firebase ID token obtenu après validation du code OTP",
  })
  @IsString()
  @MinLength(20)
  idToken: string;

  @ApiPropertyOptional({
    example: "Grâce M.",
    description: "Obligatoire lors de la création du compte",
  })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  displayName?: string;
}
