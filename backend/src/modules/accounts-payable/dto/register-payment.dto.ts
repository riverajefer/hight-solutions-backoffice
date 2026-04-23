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

export class RegisterPaymentDto {
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

  @ApiPropertyOptional({ description: 'Notas adicionales del pago' })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiPropertyOptional({ description: 'ID del archivo de comprobante de pago' })
  @IsString()
  @IsOptional()
  receiptFileId?: string;

  @ApiPropertyOptional({ description: 'ID de la sesión de caja para registrar movimiento' })
  @IsUUID()
  @IsOptional()
  cashSessionId?: string;
}
