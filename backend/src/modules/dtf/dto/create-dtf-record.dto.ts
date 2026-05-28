import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsUUID, IsNotEmpty, IsNumber, IsPositive, IsOptional, IsString, IsArray, ValidateNested, ArrayMinSize } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateDtfRecordDto {
  @ApiProperty({ description: 'ID del producto DTF', example: 'uuid-product' })
  @IsUUID()
  @IsNotEmpty()
  productId: string;

  @ApiProperty({ description: 'ID del cliente', example: 'uuid-client' })
  @IsUUID()
  @IsNotEmpty()
  clientId: string;

  @ApiProperty({ description: 'Cantidad', example: 0.31 })
  @IsNumber()
  @IsPositive()
  quantity: number;

  @ApiPropertyOptional({ description: 'Precio unitario personalizado (descuento por cliente)', example: 17000 })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  unitPrice?: number;

  @ApiPropertyOptional({ description: 'Notas u observaciones' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class BulkCreateDtfDto {
  @ApiProperty({ type: [CreateDtfRecordDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateDtfRecordDto)
  items: CreateDtfRecordDto[];
}
