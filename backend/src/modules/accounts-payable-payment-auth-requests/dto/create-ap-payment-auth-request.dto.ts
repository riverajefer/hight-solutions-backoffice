import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PaymentMethod } from '../../../generated/prisma';

export class CreateApPaymentAuthRequestDto {
  @ApiProperty({ description: 'ID de la Cuenta por Pagar a pagar' })
  @IsUUID()
  accountPayableId: string;

  @ApiProperty({ description: 'Monto del pago/abono', minimum: 0.01 })
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  amount: number;

  @ApiProperty({ enum: PaymentMethod, description: 'Método de pago' })
  @IsEnum(PaymentMethod)
  @IsNotEmpty()
  paymentMethod: PaymentMethod;

  @ApiProperty({ description: 'Fecha del pago (ISO 8601)' })
  @IsDateString()
  @IsNotEmpty()
  paymentDate: string;

  @ApiPropertyOptional({ description: 'Número de referencia / comprobante' })
  @IsString()
  @IsOptional()
  reference?: string;

  @ApiPropertyOptional({ description: 'Notas adicionales' })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiPropertyOptional({ description: 'ID del archivo de comprobante' })
  @IsString()
  @IsOptional()
  receiptFileId?: string;

  @ApiPropertyOptional({ description: 'Justificación del pago' })
  @IsString()
  @IsOptional()
  reason?: string;
}
