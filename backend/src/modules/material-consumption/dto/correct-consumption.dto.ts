import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsUUID, Min, ValidateIf } from 'class-validator';
import { Type } from 'class-transformer';

export class CorrectConsumptionDto {
  @ApiProperty({ description: 'Insumo consumido (p. ej. Rollo DTF UV)' })
  @IsUUID()
  supplyId: string;

  @ApiProperty({
    description:
      'Cantidad real usada por el ítem, en la unidad de consumo. `null` vuelve al cálculo automático de la regla del producto',
    nullable: true,
    example: 0.5,
  })
  @ValidateIf((_, v) => v !== null)
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0.0001)
  quantity: number | null;
}
