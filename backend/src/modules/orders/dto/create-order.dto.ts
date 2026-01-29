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
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateOrderItemDto {
  @ApiPropertyOptional({
    description: 'ID del servicio (opcional)',
    example: 'uuid-service',
  })
  @IsOptional()
  @IsUUID()
  serviceId?: string;

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
}
