import { IsEnum, IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { WorkOrderStatus } from '../../../generated/prisma';

export class FilterWorkOrdersDto {
  @ApiPropertyOptional({ description: 'Filtrar por estado', enum: WorkOrderStatus })
  @IsOptional()
  @IsEnum(WorkOrderStatus)
  status?: WorkOrderStatus;

  @ApiPropertyOptional({ description: 'Filtrar por ID de orden de pedido' })
  @IsOptional()
  @IsUUID()
  orderId?: string;

  @ApiPropertyOptional({ description: 'Buscar por número de OT o cliente' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Página', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Límite por página', default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  limit?: number = 20;
}
