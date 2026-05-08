import { IsDateString, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class FinancialQueryDto {
  @ApiPropertyOptional({ description: 'Fecha inicio del período (ISO date string)' })
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiPropertyOptional({ description: 'Fecha fin del período (ISO date string)' })
  @IsOptional()
  @IsDateString()
  dateTo?: string;
}
