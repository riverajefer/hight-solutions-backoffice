import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';
import { Type } from 'class-transformer';
import { RecurringFrequency } from '../../../generated/prisma';

export class UpdateAccountPayableDto {
  @ApiPropertyOptional({ description: 'ID del tipo de gasto asociado' })
  @IsUUID()
  @IsOptional()
  expenseTypeId?: string;

  @ApiPropertyOptional({ description: 'ID de la subcategoría de gasto asociada' })
  @IsUUID()
  @IsOptional()
  expenseSubcategoryId?: string;

  @ApiPropertyOptional({ description: 'Descripción de la cuenta por pagar' })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({ description: 'Observaciones adicionales' })
  @IsString()
  @IsOptional()
  observations?: string;

  @ApiPropertyOptional({ description: 'Monto total a pagar (con IVA incluido si aplica)', minimum: 0.01 })
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  @IsOptional()
  totalAmount?: number;

  @ApiPropertyOptional({
    description:
      'Base gravable. Cuando se envía, el backend recalcula `totalAmount` a partir de ella, del IVA y de las retenciones.',
    minimum: 0.01,
  })
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  @IsOptional()
  subtotalAmount?: number;

  @ApiPropertyOptional({ description: 'Indica si el monto incluye IVA' })
  @IsBoolean()
  @IsOptional()
  applyIva?: boolean;

  @ApiPropertyOptional({ description: 'Tasa de IVA en decimal (0.19 = 19%)' })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(1)
  @IsOptional()
  ivaRate?: number;

  @ApiPropertyOptional({ description: 'Retefuente en decimal (0.025 = 2.5%), sobre el subtotal' })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(1)
  @IsOptional()
  retefuenteRate?: number;

  @ApiPropertyOptional({ description: 'ReteICA en decimal (0.00414 = 0.414%), sobre el subtotal' })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(1)
  @IsOptional()
  reteICARate?: number;

  @ApiPropertyOptional({ description: 'ReteIVA en decimal (0.15 = 15%), sobre el IVA' })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(1)
  @IsOptional()
  reteIVARate?: number;

  @ApiPropertyOptional({ description: 'Fecha de vencimiento (ISO 8601)' })
  @IsDateString()
  @IsOptional()
  dueDate?: string;

  @ApiPropertyOptional({ description: 'ID del proveedor/acreedor' })
  @IsUUID()
  @IsOptional()
  supplierId?: string;

  @ApiPropertyOptional({
    description:
      'ID del usuario beneficiario del anticipo (Personal / Anticipos). Se vincula al periodo de nómina en curso.',
  })
  @IsUUID()
  @IsOptional()
  beneficiaryUserId?: string;

  @ApiPropertyOptional({ description: 'Indica si es un pago recurrente' })
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
  @IsOptional()
  recurringFrequency?: RecurringFrequency;
}
