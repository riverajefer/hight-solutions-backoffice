import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, IsUUID, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ExpenseOrderStatus } from '../../../generated/prisma';

export class FilterExpenseOrdersDto {
  @ApiPropertyOptional({ enum: ExpenseOrderStatus, description: 'Filtrar por estado' })
  @IsEnum(ExpenseOrderStatus)
  @IsOptional()
  status?: ExpenseOrderStatus;

  @ApiPropertyOptional({ description: 'Filtrar por ID de OT asociada' })
  @IsUUID()
  @IsOptional()
  workOrderId?: string;

  @ApiPropertyOptional({ description: 'Filtrar por ID de tipo de gasto' })
  @IsUUID()
  @IsOptional()
  expenseTypeId?: string;

  @ApiPropertyOptional({ description: 'Búsqueda por número OG o nombre de usuario' })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({ default: 1, description: 'Página' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({ default: 20, description: 'Resultados por página' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  limit?: number = 20;
}
