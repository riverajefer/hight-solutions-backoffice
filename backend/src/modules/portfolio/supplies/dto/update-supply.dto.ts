import { ApiPropertyOptional } from '@nestjs/swagger';
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

export class UpdateSupplyDto {
  @ApiPropertyOptional({
    description: 'Nombre del insumo',
    minLength: 2,
    maxLength: 150,
  })
  @IsString()
  @IsOptional()
  @MinLength(2)
  @MaxLength(150)
  name?: string;

  @ApiPropertyOptional({
    description: 'SKU o código del insumo',
    maxLength: 50,
  })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  sku?: string;

  @ApiPropertyOptional({
    description: 'Descripción del insumo',
    maxLength: 1000,
  })
  @IsString()
  @IsOptional()
  @MaxLength(1000)
  description?: string;

  @ApiPropertyOptional({
    description: 'ID de la categoría del insumo',
  })
  @IsUUID()
  @IsOptional()
  categoryId?: string;

  @ApiPropertyOptional({
    description: 'Precio de compra del insumo',
    type: 'number',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  purchasePrice?: number;

  @ApiPropertyOptional({
    description: 'ID de la unidad de compra',
  })
  @IsUUID()
  @IsOptional()
  purchaseUnitId?: string;

  @ApiPropertyOptional({
    description: 'ID de la unidad de consumo',
  })
  @IsUUID()
  @IsOptional()
  consumptionUnitId?: string;

  @ApiPropertyOptional({
    description: 'Factor de conversión entre unidad de compra y consumo',
    type: 'number',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0.0001)
  conversionFactor?: number;

  @ApiPropertyOptional({
    description: 'Stock actual del insumo',
    type: 'number',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  currentStock?: number;

  @ApiPropertyOptional({
    description: 'Stock mínimo requerido',
    type: 'number',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minimumStock?: number;
}
