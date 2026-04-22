import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { AccountPayableStatus } from '../../../generated/prisma';

export class FilterAccountPayableDto {
  @ApiPropertyOptional({ enum: AccountPayableStatus, description: 'Filtrar por estado' })
  @IsEnum(AccountPayableStatus)
  @IsOptional()
  status?: AccountPayableStatus;

  @ApiPropertyOptional({ description: 'Filtrar por ID de tipo de gasto' })
  @IsUUID()
  @IsOptional()
  expenseTypeId?: string;

  @ApiPropertyOptional({ description: 'Filtrar por ID de subcategoría' })
  @IsUUID()
  @IsOptional()
  expenseSubcategoryId?: string;

  @ApiPropertyOptional({ description: 'Filtrar por proveedor' })
  @IsUUID()
  @IsOptional()
  supplierId?: string;

  @ApiPropertyOptional({ description: 'Buscar en descripción' })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({ description: 'Fecha de vencimiento desde (ISO 8601)' })
  @IsDateString()
  @IsOptional()
  dueDateFrom?: string;

  @ApiPropertyOptional({ description: 'Fecha de vencimiento hasta (ISO 8601)' })
  @IsDateString()
  @IsOptional()
  dueDateTo?: string;

  @ApiPropertyOptional({ description: 'Página', default: 1, minimum: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Resultados por página', default: 20, minimum: 1, maximum: 100 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  limit?: number = 20;

  @ApiPropertyOptional({ description: 'Ordenar por campo', enum: ['dueDate', 'totalAmount', 'createdAt'], default: 'dueDate' })
  @IsEnum(['dueDate', 'totalAmount', 'createdAt'])
  @IsOptional()
  orderBy?: 'dueDate' | 'totalAmount' | 'createdAt' = 'dueDate';

  @ApiPropertyOptional({ description: 'Dirección del orden', enum: ['asc', 'desc'], default: 'asc' })
  @IsEnum(['asc', 'desc'])
  @IsOptional()
  orderDir?: 'asc' | 'desc' = 'asc';
}
