import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsOptional,
  IsUUID,
  IsDateString,
  IsInt,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { OrderStatus } from '../../../generated/prisma';

export class FilterOrdersDto {
  @ApiPropertyOptional({
    description: 'Filtrar por estado',
    enum: OrderStatus,
  })
  @IsOptional()
  @IsEnum(OrderStatus)
  status?: OrderStatus;

  @ApiPropertyOptional({
    description: 'Filtrar por cliente',
    example: 'uuid-client',
  })
  @IsOptional()
  @IsUUID()
  clientId?: string;

  @ApiPropertyOptional({
    description: 'Fecha de orden desde (ISO 8601)',
    example: '2026-01-01',
  })
  @IsOptional()
  @IsDateString()
  orderDateFrom?: string;

  @ApiPropertyOptional({
    description: 'Fecha de orden hasta (ISO 8601)',
    example: '2026-12-31',
  })
  @IsOptional()
  @IsDateString()
  orderDateTo?: string;

  @ApiPropertyOptional({
    description: 'Número de página',
    example: 1,
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Elementos por página',
    example: 20,
    default: 20,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 20;
}
