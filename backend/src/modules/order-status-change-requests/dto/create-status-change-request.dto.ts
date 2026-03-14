import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { OrderStatus } from '../../../generated/prisma';

export class CreateStatusChangeRequestDto {
  @ApiProperty({
    description: 'ID de la orden',
    example: 'uuid-here',
  })
  @IsNotEmpty()
  @IsString()
  orderId: string;

  @ApiProperty({
    description: 'Estado actual de la orden',
    enum: OrderStatus,
    example: OrderStatus.READY,
  })
  @IsNotEmpty()
  @IsEnum(OrderStatus)
  currentStatus: OrderStatus;

  @ApiProperty({
    description: 'Estado solicitado',
    enum: OrderStatus,
    example: OrderStatus.DELIVERED_ON_CREDIT,
  })
  @IsNotEmpty()
  @IsEnum(OrderStatus)
  requestedStatus: OrderStatus;

  @ApiProperty({
    description: 'Razón del cambio de estado (opcional)',
    example: 'Cliente pagará en 30 días',
    required: false,
  })
  @IsOptional()
  @IsString()
  reason?: string;
}
