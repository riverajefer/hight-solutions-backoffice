import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MinLength,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentMethod, RefundReason } from '../../../generated/prisma';

export class CreateRefundRequestDto {
  @ApiProperty({ description: 'ID de la orden' })
  @IsUUID()
  orderId: string;

  @ApiProperty({
    description: 'Dinero que sale de la caja hacia el cliente (COP)',
    example: 50000,
  })
  @IsNumber()
  @Min(0.01)
  refundAmount: number;

  @ApiPropertyOptional({
    description:
      'Valor de la venta que se anula (COP). Cero o ausente = devolución de ' +
      'saldo a favor, que no toca el valor de la orden. Mayor que cero = el ' +
      'trabajo no se entregó o no cumplió, y esa parte de la venta deja de existir.',
    example: 200000,
    default: 0,
  })
  @IsNumber()
  @Min(0)
  @IsOptional()
  reversedAmount?: number;

  @ApiPropertyOptional({
    description: 'Motivo de la devolución',
    enum: RefundReason,
    default: RefundReason.CREDIT_BALANCE,
  })
  @IsEnum(RefundReason)
  @IsOptional()
  refundReason?: RefundReason;

  @ApiProperty({
    description: 'Método de pago por el que saldrá el dinero de caja',
    enum: PaymentMethod,
  })
  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod;

  @ApiPropertyOptional({
    description: 'Entidad bancaria de origen (solo aplica a transferencias)',
    example: 'Bancolombia',
  })
  @IsString()
  @IsOptional()
  bankEntity?: string;

  @ApiPropertyOptional({
    description:
      'Id del archivo de comprobante (solo aplica a transferencias). Una ' +
      'devolución en efectivo ya queda soportada por el recibo de caja.',
  })
  @IsString()
  @IsOptional()
  receiptFileId?: string;

  @ApiProperty({
    description: 'Observación obligatoria (mínimo 5 caracteres)',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(5)
  observation: string;
}
