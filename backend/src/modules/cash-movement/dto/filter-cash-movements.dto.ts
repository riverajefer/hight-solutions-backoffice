import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { CashMovementType } from '../../../generated/prisma';

export class FilterCashMovementsDto {
  @ApiPropertyOptional({ description: 'Filtrar por ID de sesión de caja' })
  @IsOptional()
  @IsString()
  cashSessionId?: string;

  @ApiPropertyOptional({ enum: CashMovementType })
  @IsOptional()
  @IsEnum(CashMovementType)
  movementType?: CashMovementType;

  @ApiPropertyOptional({ description: 'Incluir movimientos anulados' })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  includeVoided?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number = 50;
}
