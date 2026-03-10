import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { InventoryMovementType } from '../../../generated/prisma';

export class CreateInventoryMovementDto {
  @ApiProperty({ description: 'ID del insumo', example: 'uuid-del-insumo' })
  @IsUUID()
  @IsNotEmpty()
  supplyId: string;

  @ApiProperty({
    enum: InventoryMovementType,
    description: 'Tipo de movimiento (EXIT es automático del sistema, no se envía manualmente)',
    example: InventoryMovementType.ENTRY,
  })
  @IsEnum(InventoryMovementType)
  type: InventoryMovementType;

  @ApiProperty({ description: 'Cantidad del movimiento (positivo)', example: 10 })
  @IsNumber()
  @IsPositive()
  quantity: number;

  @ApiPropertyOptional({
    description: 'Costo unitario en el momento del movimiento (útil para ENTRY)',
    example: 5000,
  })
  @IsNumber()
  @IsOptional()
  unitCost?: number;

  @ApiPropertyOptional({
    description: 'Motivo del movimiento (requerido para ADJUSTMENT)',
    example: 'Conteo físico detectó diferencia',
  })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  reason?: string;

  @ApiPropertyOptional({ description: 'Notas adicionales', example: 'Compra factura #1234' })
  @IsString()
  @IsOptional()
  @MaxLength(1000)
  notes?: string;
}
