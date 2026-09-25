import { ApiProperty } from "@nestjs/swagger";
import {
  IsString,
  IsUrl,
  MaxLength,
  MinLength,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";

class PushKeysDto {
  @ApiProperty()
  @IsString()
  @MinLength(20)
  @MaxLength(200)
  p256dh: string;

  @ApiProperty()
  @IsString()
  @MinLength(10)
  @MaxLength(100)
  auth: string;
}

export class PushSubscriptionDto {
  @ApiProperty()
  @IsUrl(
    { require_protocol: true },
    { message: "endpoint doit être une URL valide" },
  )
  @MaxLength(2000)
  endpoint: string;

  @ApiProperty({ type: PushKeysDto })
  @ValidateNested()
  @Type(() => PushKeysDto)
  keys: PushKeysDto;
}
