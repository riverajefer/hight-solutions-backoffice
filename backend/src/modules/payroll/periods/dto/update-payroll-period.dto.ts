import {
  IsEnum,
  IsISO8601,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { PayrollPeriodType } from './create-payroll-period.dto';

export enum PayrollPeriodStatus {
  DRAFT = 'DRAFT',
  CALCULATED = 'CALCULATED',
  PAID = 'PAID',
}

export class UpdatePayrollPeriodDto {
  @ApiPropertyOptional({ description: 'Nombre del periodo' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ description: 'Fecha de inicio', example: '2026-01-01' })
  @IsISO8601()
  @IsOptional()
  startDate?: string;

  @ApiPropertyOptional({ description: 'Fecha de fin', example: '2026-01-15' })
  @IsISO8601()
  @IsOptional()
  endDate?: string;

  @ApiPropertyOptional({ enum: PayrollPeriodType })
  @IsEnum(PayrollPeriodType)
  @IsOptional()
  periodType?: PayrollPeriodType;

  @ApiPropertyOptional({ enum: PayrollPeriodStatus })
  @IsEnum(PayrollPeriodStatus)
  @IsOptional()
  status?: PayrollPeriodStatus;

  @ApiPropertyOptional({ description: 'Tarifa hora extra diurna (COP)', example: 9950 })
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  @IsOptional()
  overtimeDaytimeRate?: number;

  @ApiPropertyOptional({ description: 'Tarifa hora extra nocturna (COP)', example: 13900 })
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  @IsOptional()
  overtimeNighttimeRate?: number;

  @ApiPropertyOptional({ description: 'Notas del periodo' })
  @IsString()
  @IsOptional()
  notes?: string;
}
