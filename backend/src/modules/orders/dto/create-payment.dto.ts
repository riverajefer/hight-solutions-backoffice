import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsOptional,
  IsString,
  IsDateString,
  IsUUID,
} from 'class-validator';
import { PaymentMethod } from '../../../generated/prisma';
import { IsValidPaymentAmount } from '../../../common/validators/payment-amount.validator';

export class CreatePaymentDto {
  @ApiProperty({
    description:
      'Monto del pago. Debe ser 0 cuando el método es CREDIT: el crédito no ' +
      'registra dinero, deja el valor como saldo pendiente de la orden.',
    example: 100000,
  })
  @IsValidPaymentAmount()
  amount: number;

  @ApiProperty({
    description: 'Método de pago',
    enum: PaymentMethod,
    example: PaymentMethod.CASH,
  })
  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod;

  @ApiPropertyOptional({
    description: 'Fecha del pago (ISO 8601)',
    example: '2026-01-29T10:00:00Z',
  })
  @IsOptional()
  @IsDateString()
  paymentDate?: string;

  @ApiPropertyOptional({
    description: 'Número de referencia o comprobante',
    example: 'REF-12345',
  })
  @IsOptional()
  @IsString()
  reference?: string;

  @ApiPropertyOptional({
    description: 'Observaciones del pago',
    example: 'Pago parcial acordado con cliente',
  })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({
    description: 'Entidad bancaria de origen (solo aplica a transferencias)',
    example: 'Bancolombia',
  })
  @IsOptional()
  @IsString()
  bankEntity?: string;

  @ApiPropertyOptional({
    description: 'ID del archivo de comprobante de pago',
    example: 'uuid-del-archivo',
  })
  @IsOptional()
  @IsString()
  receiptFileId?: string;

  @ApiPropertyOptional({
    description:
      'Llave de idempotencia generada por el diálogo de abono. Si llegan dos peticiones con la misma llave (doble clic, reintento de red), la segunda devuelve el pago ya registrado en vez de inflar el saldo pagado y el arqueo de caja.',
  })
  @IsUUID()
  @IsOptional()
  idempotencyKey?: string;
}
