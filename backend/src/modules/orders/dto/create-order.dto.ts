import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsUUID,
  IsDateString,
  IsOptional,
  IsString,
  IsArray,
  ValidateNested,
  IsNumber,
  IsPositive,
  Min,
  IsEnum,
  ValidateIf,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PaymentMethod } from '../../../generated/prisma';

export class InitialPaymentDto {
  @ApiProperty({
    description: 'Monto del pago inicial',
    example: 50000,
  })
  @IsNumber()
  @Min(0)
  @ValidateIf((o: InitialPaymentDto) => o.paymentMethod !== PaymentMethod.CREDIT)
  @IsPositive({ message: 'El monto debe ser mayor a cero para este método de pago' })
  amount: number;

  @ApiProperty({
    description: 'Método de pago',
    enum: PaymentMethod,
    example: PaymentMethod.CASH,
  })
  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod;

  @ApiPropertyOptional({
    description: 'Número de referencia o comprobante',
    example: 'REF-12345',
  })
  @IsOptional()
  @IsString()
  reference?: string;

  @ApiPropertyOptional({
    description: 'Observaciones del pago',
    example: 'Anticipo del 50%',
  })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreateOrderItemDto {
  @ApiPropertyOptional({
    description: 'ID del item existente (solo para actualización de orden)',
    example: 'uuid-item',
  })
  @IsOptional()
  @IsUUID()
  id?: string;

  @ApiPropertyOptional({
    description: 'ID del producto (opcional)',
    example: 'uuid-service',
  })
  @IsOptional()
  @IsUUID()
  productId?: string;

  @ApiProperty({
    description: 'Descripción del item',
    example: 'Diseño de logo corporativo',
  })
  @IsString()
  description: string;

  @ApiProperty({
    description: 'Cantidad',
    example: 2,
  })
  @IsNumber()
  @IsPositive()
  quantity: number;

  @ApiProperty({
    description: 'Precio unitario',
    example: 150000,
  })
  @IsNumber()
  @Min(0)
  unitPrice: number;

  @ApiPropertyOptional({
    description: 'Especificaciones técnicas en JSON',
    example: { color: 'azul', formato: 'vectorial' },
  })
  @IsOptional()
  specifications?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'IDs de las áreas de producción asociadas',
    example: ['uuid-area-1', 'uuid-area-2'],
  })
  @IsOptional()
  @IsArray()
  @IsUUID('all', { each: true })
  productionAreaIds?: string[];
}

export class CreateOrderDto {
  @ApiProperty({
    description: 'ID del cliente',
    example: 'uuid-client',
  })
  @IsUUID()
  clientId: string;

  @ApiPropertyOptional({
    description: 'Fecha estimada de entrega',
    example: '2025-02-15',
  })
  @IsOptional()
  @IsDateString()
  deliveryDate?: string;

  @ApiPropertyOptional({
    description: 'Observaciones',
    example: 'Cliente requiere entrega urgente',
  })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({
    description: 'Items de la orden',
    type: [CreateOrderItemDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items: CreateOrderItemDto[];

  @ApiPropertyOptional({
    description: 'Pago inicial al crear la orden (opcional)',
    type: InitialPaymentDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => InitialPaymentDto)
  initialPayment?: InitialPaymentDto;

  @ApiPropertyOptional({
    description: 'ID del canal comercial',
    example: 'uuid-channel',
  })
  @IsOptional()
  @IsUUID()
  commercialChannelId?: string;
}
