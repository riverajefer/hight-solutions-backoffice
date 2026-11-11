import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsInt, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { MAX_PAGE_SIZE } from '../../../common/dto/pagination.dto';

export const SUPPLY_LOT_VIEWS = ['active', 'low', 'history', 'all'] as const;
export type SupplyLotView = (typeof SUPPLY_LOT_VIEWS)[number];

export class FilterSupplyLotsDto {
  @ApiPropertyOptional({ description: 'Filtrar por insumo' })
  @IsOptional()
  @IsUUID()
  supplyId?: string;

  @ApiPropertyOptional({
    enum: SUPPLY_LOT_VIEWS,
    default: 'active',
    description:
      'active: con saldo · low: con saldo bajo el umbral · history: agotados, cerrados y anulados · all: todos',
  })
  @IsOptional()
  @IsIn(SUPPLY_LOT_VIEWS)
  view?: SupplyLotView = 'active';

  @ApiPropertyOptional({ description: 'Buscar por código del lote' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ default: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_PAGE_SIZE)
  @IsOptional()
  limit?: number = 20;
}
