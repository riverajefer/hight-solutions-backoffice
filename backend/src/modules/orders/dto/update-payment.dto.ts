import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsOptional,
  IsString,
  IsDateString,
} from 'class-validator';
import { PaymentMethod } from '../../../generated/prisma';
import { IsValidPaymentAmount } from '../../../common/validators/payment-amount.validator';

/**
 * DTO para editar un pago existente de una orden.
 * Todos los campos son opcionales: solo se aplican los que se envían.
 * La edición puede requerir aprobación del admin (ver PaymentEditApproval).
 */
export class UpdatePaymentDto {
  @ApiPropertyOptional({
    description:
      'Nuevo monto del pago. Debe ser 0 cuando el método es CREDIT.',
    example: 107000,
  })
  @IsOptional()
  @IsValidPaymentAmount()
  amount?: number;

  @ApiPropertyOptional({
    description: 'Nuevo método de pago',
    enum: PaymentMethod,
  })
  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;

  @ApiPropertyOptional({
    description: 'Nueva fecha del pago (ISO 8601)',
    example: '2026-01-29T10:00:00Z',
  })
  @IsOptional()
  @IsDateString()
  paymentDate?: string;

  @ApiPropertyOptional({
    description: 'Nuevo número de referencia o comprobante',
  })
  @IsOptional()
  @IsString()
  reference?: string;

  @ApiPropertyOptional({
    description: 'Nuevas observaciones del pago',
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
    description: 'Motivo de la edición (se incluye en la solicitud de aprobación)',
    example: 'El valor consignado fue $107.000, no $258.000',
  })
  @IsOptional()
  @IsString()
  reason?: string;
}
