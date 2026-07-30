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
import { PaymentMethod } from '../../../generated/prisma';

export class CreateRefundRequestDto {
  @ApiProperty({ description: 'ID de la orden con saldo a favor' })
  @IsUUID()
  orderId: string;

  @ApiProperty({ description: 'Monto a devolver (COP)', example: 50000 })
  @IsNumber()
  @Min(0.01)
  refundAmount: number;

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

  @ApiProperty({
    description: 'Observación obligatoria (mínimo 5 caracteres)',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(5)
  observation: string;
}
