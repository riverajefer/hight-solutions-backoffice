import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { Type } from 'class-transformer';
import { RecurringFrequency } from '../../../generated/prisma';

export class CreateAccountPayableDto {
  @ApiProperty({ description: 'ID del tipo de gasto asociado' })
  @IsUUID()
  @IsNotEmpty()
  expenseTypeId: string;

  @ApiProperty({ description: 'ID de la subcategoría de gasto asociada' })
  @IsUUID()
  @IsNotEmpty()
  expenseSubcategoryId: string;

  @ApiPropertyOptional({ description: 'Descripción de la cuenta por pagar' })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({ description: 'Observaciones adicionales' })
  @IsString()
  @IsOptional()
  observations?: string;

  @ApiProperty({ description: 'Monto total a pagar', minimum: 0.01 })
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  totalAmount: number;

  @ApiProperty({ description: 'Fecha de vencimiento (ISO 8601)' })
  @IsDateString()
  @IsNotEmpty()
  dueDate: string;

  @ApiPropertyOptional({ description: 'ID del proveedor/acreedor' })
  @IsUUID()
  @IsOptional()
  supplierId?: string;

  @ApiPropertyOptional({ description: 'ID de la Orden de Gasto que originó esta cuenta' })
  @IsUUID()
  @IsOptional()
  expenseOrderId?: string;

  @ApiPropertyOptional({ description: 'Indica si es un pago recurrente', default: false })
  @IsBoolean()
  @IsOptional()
  isRecurring?: boolean;

  @ApiPropertyOptional({ description: 'Día del mes para pagos recurrentes (1-31)', minimum: 1, maximum: 31 })
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(31)
  @IsOptional()
  recurringDay?: number;

  @ApiPropertyOptional({ description: 'Frecuencia del pago recurrente', enum: RecurringFrequency })
  @IsEnum(RecurringFrequency)
  @ValidateIf((o) => o.isRecurring === true)
  @IsNotEmpty()
  recurringFrequency?: RecurringFrequency;
}
