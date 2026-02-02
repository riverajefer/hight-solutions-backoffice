import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsPositive,
  Min,
  ValidateIf,
  IsString,
  IsDateString,
} from 'class-validator';
import { PaymentMethod } from '../../../generated/prisma';

export class CreatePaymentDto {
  @ApiProperty({
    description: 'Monto del pago',
    example: 100000,
  })
  @IsNumber()
  @Min(0)
  @ValidateIf((o: CreatePaymentDto) => o.paymentMethod !== PaymentMethod.CREDIT)
  @IsPositive({ message: 'El monto debe ser mayor a cero para este método de pago' })
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
}
