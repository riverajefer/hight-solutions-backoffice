import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString, IsUUID, MaxLength, Min, ValidateIf } from 'class-validator';
import { Type } from 'class-transformer';

export class CorrectConsumptionDto {
  @ApiProperty({ description: 'Insumo consumido (p. ej. Rollo DTF UV). Puede no estar en la receta del producto' })
  @IsUUID()
  supplyId: string;

  @ApiProperty({
    description:
      'Cantidad real usada por el ítem, en la unidad de consumo. 0 = no gastó (lo puso el cliente; exige `note`). `null` vuelve al cálculo automático de la regla del producto',
    nullable: true,
    example: 0.5,
  })
  @ValidateIf((_, v) => v !== null)
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  quantity: number | null;

  @ApiPropertyOptional({ description: 'Motivo de la corrección (obligatorio si la cantidad es 0)', maxLength: 300 })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  note?: string;
}

export class SwapConsumptionSupplyDto {
  @ApiProperty({ description: 'Insumo de la receta que NO se usó' })
  @IsUUID()
  fromSupplyId: string;

  @ApiProperty({ description: 'Insumo con rollos que sí se usó (misma unidad de consumo)' })
  @IsUUID()
  toSupplyId: string;

  @ApiPropertyOptional({
    description: 'Cantidad usada del nuevo insumo. Si se omite, se traslada lo que llevaba el de origen',
    example: 2.5,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0.0001)
  quantity?: number;

  @ApiPropertyOptional({ description: 'Observación', maxLength: 300 })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  note?: string;
}
