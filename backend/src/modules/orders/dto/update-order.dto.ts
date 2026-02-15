import { ApiPropertyOptional, PartialType, OmitType } from '@nestjs/swagger';
import { CreateOrderDto } from './create-order.dto';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { OrderStatus } from '../../../generated/prisma';

export class UpdateOrderDto extends PartialType(CreateOrderDto) {
  @ApiPropertyOptional({
    description: 'Estado de la orden',
    enum: OrderStatus,
  })
  @IsOptional()
  @IsEnum(OrderStatus)
  status?: OrderStatus;

  @ApiPropertyOptional({
    description: 'Razón del cambio de fecha de entrega (requerido cuando se pospone la fecha)',
    example: 'Retraso en la disponibilidad de materiales',
  })
  @IsOptional()
  @IsString()
  deliveryDateReason?: string;
}
