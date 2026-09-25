import { ApiProperty } from "@nestjs/swagger";
import { IsString, ValidateNested } from "class-validator";
import { Type } from "class-transformer";
import { PushSubscriptionDto } from "./push-subscription.dto";

export class SubscribeOrderDto {
  @ApiProperty()
  @IsString()
  reference: string;

  @ApiProperty({ type: PushSubscriptionDto })
  @ValidateNested()
  @Type(() => PushSubscriptionDto)
  subscription: PushSubscriptionDto;
}
