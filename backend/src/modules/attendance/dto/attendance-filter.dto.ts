import { IsOptional, IsDateString, IsString, IsEnum, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { AttendanceType, AttendanceSource } from '../../../generated/prisma';

export class AttendanceFilterDto {
  @ApiPropertyOptional({ description: 'Fecha inicio (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'Fecha fin (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ description: 'Filtrar por userId' })
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiPropertyOptional({ description: 'Filtrar por areaId' })
  @IsOptional()
  @IsString()
  areaId?: string;

  @ApiPropertyOptional({ description: 'Filtrar por cargoId' })
  @IsOptional()
  @IsString()
  cargoId?: string;

  @ApiPropertyOptional({ enum: AttendanceType })
  @IsOptional()
  @IsEnum(AttendanceType)
  type?: AttendanceType;

  @ApiPropertyOptional({ enum: AttendanceSource })
  @IsOptional()
  @IsEnum(AttendanceSource)
  source?: AttendanceSource;

  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  limit?: number = 20;
}
