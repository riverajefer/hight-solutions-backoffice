import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNumber, IsOptional, IsUUID, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class UpsertSalesGoalDto {
  @ApiProperty({ description: 'ID del asesor', example: 'uuid-user' })
  @IsUUID()
  advisorId: string;

  @ApiProperty({ description: 'Mes (1-12)', example: 5 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  month: number;

  @ApiProperty({ description: 'Año', example: 2026 })
  @Type(() => Number)
  @IsInt()
  @Min(2020)
  year: number;

  @ApiProperty({ description: 'Meta de ventas en COP', example: 10000000 })
  @IsNumber()
  @Min(0)
  targetAmount: number;
}

export class FilterSalesGoalsDto {
  @ApiPropertyOptional({ description: 'Mes (1-12)', example: 5 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  month?: number;

  @ApiPropertyOptional({ description: 'Año', example: 2026 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(2020)
  year?: number;

  @ApiPropertyOptional({ description: 'ID del asesor' })
  @IsOptional()
  @IsUUID()
  advisorId?: string;
}
