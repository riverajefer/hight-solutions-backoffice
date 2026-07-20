import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsUUID } from 'class-validator';

export class ProspectMetricsFilterDto {
  @ApiPropertyOptional({ description: 'Inicio del rango a medir' })
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiPropertyOptional({ description: 'Fin del rango a medir' })
  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @ApiPropertyOptional({ description: 'Medir solo a esta vendedora' })
  @IsOptional()
  @IsUUID()
  advisorId?: string;
}
