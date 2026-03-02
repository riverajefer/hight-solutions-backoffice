import {
  IsArray,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateNested,
  IsNumber,
  Min,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SupplyInputDto {
  @ApiProperty({ description: 'ID del insumo' })
  @IsUUID()
  supplyId: string;

  @ApiPropertyOptional({ description: 'Cantidad estimada del insumo' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  quantity?: number;

  @ApiPropertyOptional({ description: 'Notas sobre el insumo' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreateWorkOrderItemDto {
  @ApiProperty({ description: 'ID del OrderItem de la orden de pedido' })
  @IsUUID()
  orderItemId: string;

  @ApiPropertyOptional({
    description: 'Descripción del producto (si no se proporciona, se copia del OrderItem)',
  })
  @IsOptional()
  @IsString()
  productDescription?: string;

  @ApiPropertyOptional({
    description: 'IDs de áreas de producción asignadas',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsUUID('all', { each: true })
  productionAreaIds?: string[];

  @ApiPropertyOptional({
    description: 'Insumos necesarios para este item',
    type: [SupplyInputDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SupplyInputDto)
  supplies?: SupplyInputDto[];

  @ApiPropertyOptional({ description: 'Observaciones del item' })
  @IsOptional()
  @IsString()
  observations?: string;
}

export class CreateWorkOrderDto {
  @ApiProperty({ description: 'ID de la orden de pedido origen' })
  @IsUUID()
  orderId: string;

  @ApiPropertyOptional({ description: 'ID del usuario diseñador (opcional)' })
  @IsOptional()
  @IsUUID()
  designerId?: string;

  @ApiPropertyOptional({ description: 'Nombre del archivo (máx 30 caracteres)' })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  fileName?: string;

  @ApiPropertyOptional({ description: 'Observaciones generales de la OT' })
  @IsOptional()
  @IsString()
  observations?: string;

  @ApiProperty({
    description: 'Items de la OT basados en los OrderItems de la OP',
    type: [CreateWorkOrderItemDto],
  })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateWorkOrderItemDto)
  items: CreateWorkOrderItemDto[];
}
