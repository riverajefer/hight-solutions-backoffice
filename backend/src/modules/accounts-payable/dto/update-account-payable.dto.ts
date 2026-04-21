import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsDateString,
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

export class UpdateAccountPayableDto {
  @ApiPropertyOptional({ description: 'Descripción de la cuenta por pagar', minLength: 3 })
  @IsString()
  @IsOptional()
  @MinLength(3)
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({ description: 'Observaciones adicionales' })
  @IsString()
  @IsOptional()
  observations?: string;

  @ApiPropertyOptional({ description: 'Monto total a pagar', minimum: 0.01 })
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  @IsOptional()
  totalAmount?: number;

  @ApiPropertyOptional({ description: 'Fecha de vencimiento (ISO 8601)' })
  @IsDateString()
  @IsOptional()
  dueDate?: string;

  @ApiPropertyOptional({ description: 'ID del proveedor/acreedor' })
  @IsUUID()
  @IsOptional()
  supplierId?: string;

  @ApiPropertyOptional({ description: 'Indica si es un pago recurrente' })
  @IsBoolean()
  @IsOptional()
  isRecurring?: boolean;

  @ApiPropertyOptional({ description: 'Día del mes para pagos recurrentes (1-31)', minimum: 1, maximum: 31 })
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(31)
  @ValidateIf((o) => o.isRecurring === true)
  @IsOptional()
  recurringDay?: number;
}
