import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class InstallmentItemDto {
  @ApiProperty({ description: 'Monto de la cuota' })
  @IsNumber()
  @IsPositive()
  amount: number;

  @ApiProperty({ description: 'Fecha de vencimiento de la cuota (ISO)' })
  @IsDateString()
  @IsNotEmpty()
  dueDate: string;

  @ApiProperty({ description: 'Notas opcionales', required: false })
  @IsString()
  @IsOptional()
  notes?: string;
}

export class SetInstallmentsDto {
  @ApiProperty({ type: [InstallmentItemDto], description: 'Lista de cuotas del plan de pagos' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InstallmentItemDto)
  installments: InstallmentItemDto[];
}

export class UpdateInstallmentDto {
  @ApiProperty({ description: 'Marcar cuota como pagada o pendiente' })
  @IsBoolean()
  isPaid: boolean;
}
