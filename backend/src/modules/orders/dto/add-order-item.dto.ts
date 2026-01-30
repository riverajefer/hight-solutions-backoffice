import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsUUID,
  IsOptional,
  IsString,
  IsNumber,
  IsPositive,
  Min,
} from 'class-validator';

export class AddOrderItemDto {
  @ApiPropertyOptional({
    description: 'ID del servicio del catálogo (opcional)',
    example: 'uuid-service',
  })
  @IsOptional()
  @IsUUID()
  serviceId?: string;

  @ApiProperty({
    description: 'Descripción del item',
    example: 'Banner Refilado 70x100',
  })
  @IsString()
  description: string;

  @ApiProperty({
    description: 'Cantidad',
    example: 5,
  })
  @IsNumber()
  @IsPositive()
  quantity: number;

  @ApiProperty({
    description: 'Precio unitario',
    example: 25000,
  })
  @IsNumber()
  @Min(0)
  unitPrice: number;

  @ApiPropertyOptional({
    description: 'Especificaciones técnicas en JSON',
    example: { material: 'Lona', acabado: 'mate' },
  })
  @IsOptional()
  specifications?: Record<string, any>;
}
