import { IsDateString, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class PayrollExtraShiftDto {
  @ApiProperty({ description: 'Fecha del turno extra (ISO)', example: '2026-07-20' })
  @IsDateString()
  shiftDate: string;

  @ApiPropertyOptional({ description: 'Descripción / motivo del turno', example: 'Turno dominical' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ description: 'Valor acordado del turno (COP)', example: 120000 })
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  amount: number;
}
