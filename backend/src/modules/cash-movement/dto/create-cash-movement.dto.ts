import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { CashMovementType, PaymentMethod } from '../../../generated/prisma';

export class CreateCashMovementDto {
  @ApiProperty({ description: 'ID de la sesión de caja activa' })
  @IsString()
  @IsNotEmpty()
  cashSessionId: string;

  @ApiProperty({ enum: CashMovementType, description: 'Tipo de movimiento' })
  @IsEnum(CashMovementType)
  movementType: CashMovementType;

  @ApiProperty({ enum: PaymentMethod, description: 'Método de pago' })
  @IsEnum(PaymentMethod)
  @IsOptional()
  paymentMethod?: PaymentMethod;

  @ApiProperty({ description: 'Monto del movimiento (positivo)', example: 50000 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  amount: number;

  @ApiProperty({ description: 'Descripción del movimiento', maxLength: 500 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  description: string;

  @ApiPropertyOptional({
    description: 'Tipo de referencia: "ORDER" para vincular a una OP',
    example: 'ORDER',
  })
  @IsOptional()
  @IsString()
  referenceType?: string;

  @ApiPropertyOptional({
    description: 'ID de la referencia (orderId si referenceType=ORDER)',
  })
  @ValidateIf((o) => !!o.referenceType)
  @IsString()
  @IsNotEmpty()
  referenceId?: string;
}
