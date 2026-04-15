import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsInt, IsNotEmpty, Min } from 'class-validator';

// Denominaciones colombianas válidas
export const COLOMBIAN_DENOMINATIONS = [
  100000, 50000, 20000, 10000, 5000, 2000, // Billetes
  1000, 500, 200, 100, 50, // Monedas
] as const;

export type ColombianDenomination = (typeof COLOMBIAN_DENOMINATIONS)[number];

export class DenominationCountItemDto {
  @ApiProperty({
    description: 'Valor de la denominación (billete o moneda colombiana)',
    enum: COLOMBIAN_DENOMINATIONS,
    example: 50000,
  })
  @IsIn(COLOMBIAN_DENOMINATIONS, {
    message: `denomination debe ser una denominación colombiana válida: ${COLOMBIAN_DENOMINATIONS.join(', ')}`,
  })
  denomination: ColombianDenomination;

  @ApiProperty({
    description: 'Cantidad de unidades',
    minimum: 0,
    example: 3,
  })
  @IsInt()
  @IsNotEmpty()
  @Min(0)
  quantity: number;
}
