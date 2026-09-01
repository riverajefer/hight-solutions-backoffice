import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength, MaxLength } from 'class-validator';

export class VoidPaymentDto {
  @ApiProperty({
    description:
      'Motivo de la anulación. Queda visible en el Historial de Pagos y en el arqueo de caja.',
    example: 'Pago duplicado: el mismo soporte ya se registró a las 14:35',
  })
  @IsString()
  // El motivo es lo único que le explica a quien lea el historial (o el arqueo)
  // por qué desapareció ese dinero. Un "error" de cinco letras no sirve.
  @MinLength(10, {
    message: 'Explica el motivo de la anulación (mínimo 10 caracteres)',
  })
  @MaxLength(500)
  voidReason: string;
}
