import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsUUID,
  IsArray,
  IsEnum,
  IsNumber,
  IsPositive,
  ValidateNested,
  ArrayMinSize,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PaymentMethod } from '../../../generated/prisma';

export class CreateExpenseItemDto {
  @ApiProperty({ example: 2, description: 'Cantidad' })
  @IsNumber()
  @IsPositive()
  quantity: number;

  @ApiProperty({ example: 'Resma de papel', description: 'Nombre del gasto' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name: string;

  @ApiPropertyOptional({ description: 'Descripción del gasto' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ description: 'ID del proveedor' })
  @IsUUID()
  @IsOptional()
  supplierId?: string;

  @ApiProperty({ example: 15000, description: 'Precio unitario' })
  @IsNumber()
  @IsPositive()
  unitPrice: number;

  @ApiProperty({ enum: PaymentMethod, description: 'Método de pago' })
  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod;

  @ApiPropertyOptional({ type: [String], description: 'IDs de áreas de producción (solo si hay OT)' })
  @IsArray()
  @IsUUID('all', { each: true })
  @IsOptional()
  productionAreaIds?: string[];

  @ApiPropertyOptional({ description: 'ID del archivo comprobante de pago (UploadedFile)' })
  @IsUUID()
  @IsOptional()
  receiptFileId?: string;
}

export class CreateExpenseOrderDto {
  @ApiProperty({ description: 'ID del tipo de gasto' })
  @IsUUID()
  @IsNotEmpty()
  expenseTypeId: string;

  @ApiProperty({ description: 'ID de la subcategoría de gasto' })
  @IsUUID()
  @IsNotEmpty()
  expenseSubcategoryId: string;

  @ApiPropertyOptional({ description: 'ID de la OT asociada (opcional)' })
  @IsUUID()
  @IsOptional()
  workOrderId?: string;

  @ApiProperty({ description: 'ID del usuario al que se autoriza' })
  @IsUUID()
  @IsNotEmpty()
  authorizedToId: string;

  @ApiPropertyOptional({ description: 'ID del usuario responsable (opcional)' })
  @IsUUID()
  @IsOptional()
  responsibleId?: string;

  @ApiPropertyOptional({ description: 'Observaciones generales' })
  @IsString()
  @IsOptional()
  observations?: string;

  @ApiPropertyOptional({ description: 'Área encargada o máquina' })
  @IsString()
  @IsOptional()
  @MaxLength(200)
  areaOrMachine?: string;

  @ApiProperty({ type: [CreateExpenseItemDto], description: 'Ítems de gasto (mínimo 1)' })
  @IsArray()
  @ValidateNested({ each: true })
  @ArrayMinSize(1)
  @Type(() => CreateExpenseItemDto)
  items: CreateExpenseItemDto[];
}
