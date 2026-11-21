import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { ExpenseOrderReductionMoneyLocation, PaymentMethod } from '../../../generated/prisma';

export class ReductionItemDto {
  @IsUUID()
  @ApiProperty({ description: 'ID del ítem de la OG' })
  itemId: string;

  @IsNumber()
  @Min(0.0001)
  @ApiProperty({ description: 'Cantidad nueva' })
  quantity: number;

  @IsNumber()
  @Min(0)
  @ApiProperty({ description: 'Precio unitario nuevo' })
  unitPrice: number;
}

export class PreviewExpenseOrderReductionDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ReductionItemDto)
  @ApiProperty({
    type: [ReductionItemDto],
    description: 'Valores nuevos, uno por cada ítem de la OG',
  })
  items: ReductionItemDto[];

  @IsEnum(ExpenseOrderReductionMoneyLocation)
  @ApiProperty({
    enum: ExpenseOrderReductionMoneyLocation,
    description:
      'SUPPLIER_RETURNS: el proveedor devuelve la diferencia. NEVER_LEFT: nunca salió de caja.',
  })
  moneyLocation: ExpenseOrderReductionMoneyLocation;
}

export class CreateExpenseOrderReductionDto extends PreviewExpenseOrderReductionDto {
  @IsString()
  @IsNotEmpty({ message: 'Escribe el motivo' })
  @MinLength(10, { message: 'El motivo debe tener al menos 10 caracteres' })
  @MaxLength(500)
  @ApiProperty({
    description: 'Por qué baja el valor',
    minLength: 10,
    maxLength: 500,
  })
  reason: string;
}

export class ReviewExpenseOrderReductionDto {
  @IsString()
  @IsOptional()
  @MaxLength(500)
  @ApiPropertyOptional({
    description: 'Notas del admin (obligatorias al rechazar)',
  })
  reviewNotes?: string;
}

export class RegisterReductionRefundDto {
  @IsEnum(PaymentMethod)
  @ApiProperty({
    enum: PaymentMethod,
    description: 'Cómo devolvió el dinero el proveedor',
  })
  paymentMethod: PaymentMethod;

  @IsString()
  @IsOptional()
  @MaxLength(300)
  @ApiPropertyOptional({
    description: 'Notas (p. ej. referencia de la transferencia)',
  })
  notes?: string;
}
