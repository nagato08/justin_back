import { ApiProperty } from "@nestjs/swagger";
import { IsUrl, MaxLength } from "class-validator";

export class UnsubscribeDto {
  @ApiProperty()
  @IsUrl({ require_protocol: true })
  @MaxLength(2000)
  endpoint: string;
}
