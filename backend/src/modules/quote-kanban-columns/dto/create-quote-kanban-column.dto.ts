import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Min,
} from 'class-validator';
import { QuoteStatus } from '../../../generated/prisma';

export class CreateQuoteKanbanColumnDto {
  @ApiProperty({ description: 'Nombre de la columna del tablero' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ description: 'Color hexadecimal (#rrggbb)', example: '#1976d2' })
  @IsOptional()
  @IsString()
  @Matches(/^#[0-9a-fA-F]{6}$/, { message: 'color debe ser un color hex válido (#rrggbb)' })
  color?: string;

  @ApiPropertyOptional({ description: 'Orden de visualización (ascendente)', minimum: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  displayOrder?: number;

  @ApiPropertyOptional({ description: 'Si la columna está activa y visible en el tablero' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiProperty({ enum: QuoteStatus, description: 'Estado de cotización que representa esta columna' })
  @IsEnum(QuoteStatus)
  mappedStatus: QuoteStatus;
}
