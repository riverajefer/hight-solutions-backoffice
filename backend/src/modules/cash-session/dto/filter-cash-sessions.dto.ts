import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CashSessionStatus } from '../../../generated/prisma';

export class FilterCashSessionsDto {
  @ApiPropertyOptional({ description: 'Filtrar por ID de caja registradora' })
  @IsOptional()
  @IsString()
  cashRegisterId?: string;

  @ApiPropertyOptional({ enum: CashSessionStatus, description: 'Filtrar por estado de sesión' })
  @IsOptional()
  @IsEnum(CashSessionStatus)
  status?: CashSessionStatus;

  @ApiPropertyOptional({ description: 'Filtrar por ID del cajero que abrió' })
  @IsOptional()
  @IsString()
  openedById?: string;

  @ApiPropertyOptional({ description: 'Fecha de inicio (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  openedFrom?: string;

  @ApiPropertyOptional({ description: 'Fecha de fin (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  openedTo?: string;

  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}
