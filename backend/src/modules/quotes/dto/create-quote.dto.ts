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

export class CreateQuoteItemDto {
  @ApiPropertyOptional({
    description: 'ID del item existente (solo para actualización)',
    example: 'uuid-item',
  })
  @IsOptional()
  @IsUUID()
  id?: string;

  @ApiPropertyOptional({
    description: 'ID del servicio (opcional)',
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
    description: 'ID de la imagen de muestra del item',
    example: 'uuid-image',
  })
  @IsOptional()
  @IsUUID()
  sampleImageId?: string;

  @ApiPropertyOptional({
    description: 'IDs de las áreas de producción',
    example: ['uuid-area-1', 'uuid-area-2'],
  })
  @IsOptional()
  @IsArray()
  productionAreaIds?: string[];
}

export class CreateQuoteDto {
  @ApiProperty({
    description: 'ID del cliente',
    example: 'uuid-client',
  })
  @IsUUID()
  clientId: string;

  @ApiPropertyOptional({
    description: 'Fecha de válidez de la cotización',
    example: '2025-03-01',
  })
  @IsOptional()
  @IsDateString()
  validUntil?: string;

  @ApiPropertyOptional({
    description: 'Observaciones',
    example: 'Cotización válida por 15 días',
  })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({
    description: 'Items de la cotización',
    type: [CreateQuoteItemDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateQuoteItemDto)
  items: CreateQuoteItemDto[];

  @ApiPropertyOptional({
    description: 'ID del canal comercial',
    example: 'uuid-channel',
  })
  @IsOptional()
  @IsUUID()
  commercialChannelId?: string;
}
