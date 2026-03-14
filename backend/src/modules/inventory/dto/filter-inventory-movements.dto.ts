import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, IsString, IsUUID, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { InventoryMovementType } from '../../../generated/prisma';

export class FilterInventoryMovementsDto {
  @ApiPropertyOptional({ description: 'Filtrar por ID de insumo' })
  @IsUUID()
  @IsOptional()
  supplyId?: string;

  @ApiPropertyOptional({ enum: InventoryMovementType, description: 'Filtrar por tipo de movimiento' })
  @IsEnum(InventoryMovementType)
  @IsOptional()
  type?: InventoryMovementType;

  @ApiPropertyOptional({ description: 'Filtrar por tipo de referencia (WORK_ORDER, MANUAL, INITIAL)' })
  @IsString()
  @IsOptional()
  referenceType?: string;

  @ApiPropertyOptional({ description: 'Fecha de inicio (ISO 8601)', example: '2026-01-01' })
  @IsString()
  @IsOptional()
  startDate?: string;

  @ApiPropertyOptional({ description: 'Fecha de fin (ISO 8601)', example: '2026-12-31' })
  @IsString()
  @IsOptional()
  endDate?: string;

  @ApiPropertyOptional({ default: 1, description: 'Página' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({ default: 20, description: 'Resultados por página (máx. 100)' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  limit?: number = 20;
}
