import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsDateString, IsOptional } from 'class-validator';
import { Transform } from 'class-transformer';

export class FilterClientsDto {
  @ApiPropertyOptional({ description: 'Incluir clientes inactivos' })
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  @IsOptional()
  includeInactive?: boolean;

  @ApiPropertyOptional({ description: 'Fecha de creación desde (ISO 8601)' })
  @IsDateString()
  @IsOptional()
  createdAtFrom?: string;

  @ApiPropertyOptional({ description: 'Fecha de creación hasta (ISO 8601)' })
  @IsDateString()
  @IsOptional()
  createdAtTo?: string;
}
