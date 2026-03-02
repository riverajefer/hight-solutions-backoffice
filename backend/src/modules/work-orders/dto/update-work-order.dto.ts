import {
  IsArray,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateNested,
  IsNumber,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

class UpdateSupplyInputDto {
  @ApiPropertyOptional()
  @IsUUID()
  supplyId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  quantity?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

class UpdateWorkOrderItemDto {
  @ApiPropertyOptional()
  @IsUUID()
  orderItemId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  productDescription?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsUUID('all', { each: true })
  productionAreaIds?: string[];

  @ApiPropertyOptional({ type: [UpdateSupplyInputDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateSupplyInputDto)
  supplies?: UpdateSupplyInputDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  observations?: string;
}

export class UpdateWorkOrderDto {
  @ApiPropertyOptional({ description: 'ID del usuario diseñador' })
  @IsOptional()
  @IsUUID()
  designerId?: string;

  @ApiPropertyOptional({ description: 'Nombre del archivo (máx 30 caracteres)' })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  fileName?: string;

  @ApiPropertyOptional({ description: 'Observaciones generales' })
  @IsOptional()
  @IsString()
  observations?: string;

  @ApiPropertyOptional({
    description: 'Items actualizados de la OT',
    type: [UpdateWorkOrderItemDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateWorkOrderItemDto)
  items?: UpdateWorkOrderItemDto[];
}
