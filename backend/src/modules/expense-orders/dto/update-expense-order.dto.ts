import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsUUID,
  IsArray,
  IsEnum,
  IsNumber,
  IsPositive,
  ValidateNested,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PaymentMethod } from '../../../generated/prisma';

export class UpdateExpenseItemDto {
  @ApiPropertyOptional({ description: 'ID del ítem (para actualizar existente)' })
  @IsUUID()
  @IsOptional()
  id?: string;

  @ApiPropertyOptional({ example: 2, description: 'Cantidad' })
  @IsNumber()
  @IsPositive()
  @IsOptional()
  quantity?: number;

  @ApiPropertyOptional({ example: 'Resma de papel', description: 'Nombre del gasto' })
  @IsString()
  @IsOptional()
  @MaxLength(200)
  name?: string;

  @ApiPropertyOptional({ description: 'Descripción del gasto' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ description: 'ID del proveedor' })
  @IsUUID()
  @IsOptional()
  supplierId?: string;

  @ApiPropertyOptional({ example: 15000, description: 'Precio unitario' })
  @IsNumber()
  @IsPositive()
  @IsOptional()
  unitPrice?: number;

  @ApiPropertyOptional({ enum: PaymentMethod, description: 'Método de pago' })
  @IsEnum(PaymentMethod)
  @IsOptional()
  paymentMethod?: PaymentMethod;

  @ApiPropertyOptional({ type: [String], description: 'IDs de áreas de producción' })
  @IsArray()
  @IsUUID('all', { each: true })
  @IsOptional()
  productionAreaIds?: string[];

  @ApiPropertyOptional({ description: 'ID del archivo comprobante de pago' })
  @IsUUID()
  @IsOptional()
  receiptFileId?: string;
}

export class UpdateExpenseOrderDto {
  @ApiPropertyOptional({ description: 'ID del tipo de gasto' })
  @IsUUID()
  @IsOptional()
  expenseTypeId?: string;

  @ApiPropertyOptional({ description: 'ID de la subcategoría de gasto' })
  @IsUUID()
  @IsOptional()
  expenseSubcategoryId?: string;

  @ApiPropertyOptional({ description: 'ID de la OT asociada (null para quitar)' })
  @IsUUID()
  @IsOptional()
  workOrderId?: string | null;

  @ApiPropertyOptional({ description: 'ID del usuario al que se autoriza' })
  @IsUUID()
  @IsOptional()
  authorizedToId?: string;

  @ApiPropertyOptional({ description: 'ID del usuario responsable (null para quitar)' })
  @IsUUID()
  @IsOptional()
  responsibleId?: string | null;

  @ApiPropertyOptional({ description: 'Observaciones generales' })
  @IsString()
  @IsOptional()
  observations?: string;

  @ApiPropertyOptional({ description: 'Área encargada o máquina' })
  @IsString()
  @IsOptional()
  @MaxLength(200)
  areaOrMachine?: string;

  @ApiPropertyOptional({ type: [UpdateExpenseItemDto], description: 'Ítems de gasto (reemplaza todos)' })
  @IsArray()
  @ValidateNested({ each: true })
  @IsOptional()
  @Type(() => UpdateExpenseItemDto)
  items?: UpdateExpenseItemDto[];
}
