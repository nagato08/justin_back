import { ApiProperty } from "@nestjs/swagger";
import { IsString, MinLength } from "class-validator";

export class TrackOrderQueryDto {
  @ApiProperty()
  @IsString()
  @MinLength(32)
  token: string;
}
