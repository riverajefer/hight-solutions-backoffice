import {
  IsEnum,
  IsISO8601,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export enum PayrollPeriodType {
  BIWEEKLY = 'BIWEEKLY',
  MONTHLY = 'MONTHLY',
}

export class CreatePayrollPeriodDto {
  @ApiProperty({ description: 'Nombre del periodo', example: '1 QUINCENA ENERO 2026' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: 'Fecha de inicio', example: '2026-01-01' })
  @IsISO8601()
  @IsNotEmpty()
  startDate: string;

  @ApiProperty({ description: 'Fecha de fin', example: '2026-01-15' })
  @IsISO8601()
  @IsNotEmpty()
  endDate: string;

  @ApiProperty({ enum: PayrollPeriodType, default: PayrollPeriodType.BIWEEKLY })
  @IsEnum(PayrollPeriodType)
  @IsNotEmpty()
  periodType: PayrollPeriodType;

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
