import { ApiProperty } from "@nestjs/swagger";
import { IsString, MinLength } from "class-validator";

export class GoogleAuthDto {
  @ApiProperty({
    description: "Google ID token obtenu par Google Identity Services",
  })
  @IsString()
  @MinLength(20)
  idToken: string;
}
