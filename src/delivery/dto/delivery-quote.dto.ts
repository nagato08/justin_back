import { ApiProperty } from "@nestjs/swagger";
import { IsLatitude, IsLongitude } from "class-validator";

export class DeliveryQuoteDto {
  @ApiProperty({ example: 4.089 })
  @IsLatitude()
  latitude: number;

  @ApiProperty({ example: 9.735 })
  @IsLongitude()
  longitude: number;
}
