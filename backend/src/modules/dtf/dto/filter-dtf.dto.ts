import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { DtfStatus } from '../../../generated/prisma';
import { MAX_PAGE_SIZE } from '../../../common/dto/pagination.dto';

export class FilterDtfDto {
  @ApiPropertyOptional({ enum: DtfStatus, description: 'Filtrar por estado' })
  @IsEnum(DtfStatus)
  @IsOptional()
  status?: DtfStatus;

  @ApiPropertyOptional({ description: 'Filtrar por ID de producto' })
  @IsUUID()
  @IsOptional()
  productId?: string;

  @ApiPropertyOptional({ description: 'Filtrar por ID de cliente' })
  @IsUUID()
  @IsOptional()
  clientId?: string;

  @ApiPropertyOptional({ description: 'Fecha de creación desde (ISO 8601)' })
  @IsDateString()
  @IsOptional()
  createdAtFrom?: string;

  @ApiPropertyOptional({ description: 'Fecha de creación hasta (ISO 8601)' })
  @IsDateString()
  @IsOptional()
  createdAtTo?: string;

  @ApiPropertyOptional({ default: 1, description: 'Página' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({ default: 50, description: 'Resultados por página' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_PAGE_SIZE)
  @IsOptional()
  limit?: number = 50;
}
