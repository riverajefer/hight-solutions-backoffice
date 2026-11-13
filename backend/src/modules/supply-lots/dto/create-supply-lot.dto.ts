import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateSupplyLotDto {
  @ApiProperty({ description: 'Insumo controlado por lotes (p. ej. Rollo DTF UV)' })
  @IsUUID()
  supplyId: string;

  @ApiProperty({ description: 'Largo/cantidad inicial en la unidad de consumo (m)', example: 100 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0.0001)
  initialQuantity: number;

  @ApiPropertyOptional({
    description: 'Costo por unidad (por metro). Enviar este o `totalCost`, no ambos',
    example: 1500,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  unitCost?: number;

  @ApiPropertyOptional({
    description: 'Valor total de adquisición. Enviar este o `unitCost`, no ambos',
    example: 150000,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  totalCost?: number;

  @ApiProperty({ description: 'Fecha de ingreso (ISO 8601)', example: '2026-11-10' })
  @IsDateString()
  receivedAt: string;

  @ApiPropertyOptional({ description: 'Línea de la OG con que se compró el rollo' })
  @IsOptional()
  @IsUUID()
  expenseOrderItemId?: string;

  @ApiPropertyOptional({ description: 'Observaciones', maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}
