import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { OrderStatus } from '../../../generated/prisma';

export class UpdateOrderStatusDto {
  @ApiProperty({
    description: 'Nuevo estado de la orden',
    enum: OrderStatus,
    example: OrderStatus.CONFIRMED,
  })
  @IsEnum(OrderStatus)
  status: OrderStatus;
}
