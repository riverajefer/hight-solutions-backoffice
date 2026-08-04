import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional } from 'class-validator';

export class OrdersDashboardQueryDto {
  @ApiPropertyOptional({
    description: 'Inicio del rango (YYYY-MM-DD). Por defecto, hoy',
    example: '2026-08-03',
  })
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiPropertyOptional({
    description: 'Fin del rango (YYYY-MM-DD). Por defecto, hoy',
    example: '2026-08-03',
  })
  @IsOptional()
  @IsDateString()
  dateTo?: string;
}
