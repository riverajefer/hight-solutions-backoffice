import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  MinLength,
  MaxLength,
  IsUUID,
  Min,
  IsNumber,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateSupplyDto {
  @ApiProperty({
    description: 'Nombre del insumo',
    example: 'Lona Mate 13 oz',
    minLength: 2,
    maxLength: 150,
  })
  @IsString()
  @MinLength(2)
  @MaxLength(150)
  name: string;

  @ApiPropertyOptional({
    description: 'SKU o código del insumo',
    example: 'LM-13OZ-001',
    maxLength: 50,
  })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  sku?: string;

  @ApiPropertyOptional({
    description: 'Descripción del insumo',
    example: 'Lona mate de 13 onzas para impresión de alta calidad',
    maxLength: 1000,
  })
  @IsString()
  @IsOptional()
  @MaxLength(1000)
  description?: string;

  @ApiProperty({
    description: 'ID de la categoría del insumo',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  categoryId: string;

  @ApiPropertyOptional({
    description: 'Precio de compra del insumo',
    example: 25000,
    type: 'number',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  purchasePrice?: number;

  @ApiProperty({
    description: 'ID de la unidad de compra',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  purchaseUnitId: string;

  @ApiProperty({
    description: 'ID de la unidad de consumo',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  consumptionUnitId: string;

  @ApiPropertyOptional({
    description: 'Factor de conversión entre unidad de compra y consumo',
    example: 1.5,
    type: 'number',
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0.0001)
  conversionFactor?: number;

  @ApiPropertyOptional({
    description: 'Stock actual del insumo',
    example: 100,
    type: 'number',
    default: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  currentStock?: number;

  @ApiPropertyOptional({
    description: 'Stock mínimo requerido',
    example: 10,
    type: 'number',
    default: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minimumStock?: number;
}
