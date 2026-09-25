import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { DeliveryStopStatus } from "@prisma/client";
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsLatitude,
  IsLongitude,
  IsNumber,
  IsOptional,
  IsString,
} from "class-validator";

export class CreateDeliveryAssignmentDto {
  @ApiProperty()
  @IsString()
  driverId: string;

  @ApiProperty({ type: [String] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(30)
  @IsString({ each: true })
  orderIds: string[];

  @ApiProperty()
  @IsLatitude()
  startLatitude: number;

  @ApiProperty()
  @IsLongitude()
  startLongitude: number;
}

export class DriverLocationDto {
  @IsString()
  assignmentId: string;

  @IsLatitude()
  latitude: number;

  @IsLongitude()
  longitude: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  accuracy?: number;

  @IsOptional()
  @IsNumber()
  heading?: number;

  @IsOptional()
  @IsNumber()
  speed?: number;
}

export class UpdateDeliveryStopDto {
  @ApiProperty({
    enum: [
      DeliveryStopStatus.ARRIVED,
      DeliveryStopStatus.DELIVERED,
      DeliveryStopStatus.SKIPPED,
    ],
  })
  @IsEnum(DeliveryStopStatus)
  status: DeliveryStopStatus;
}
