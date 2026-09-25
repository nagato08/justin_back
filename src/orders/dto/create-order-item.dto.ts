import { ApiProperty } from "@nestjs/swagger";
import { IsInt, IsString, Max, Min } from "class-validator";

export class CreateOrderItemDto {
  @ApiProperty()
  @IsString()
  productId: string;

  @ApiProperty({ minimum: 1, maximum: 50 })
  @IsInt()
  @Min(1)
  @Max(50)
  quantity: number;
}
