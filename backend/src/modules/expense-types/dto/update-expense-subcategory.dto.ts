import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean, IsUUID, MaxLength } from 'class-validator';

export class UpdateExpenseSubcategoryDto {
  @ApiPropertyOptional({ description: 'ID del tipo de gasto padre' })
  @IsUUID()
  @IsOptional()
  expenseTypeId?: string;

  @ApiPropertyOptional({ example: 'Insumos internos', description: 'Nombre de la subcategoría' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({ description: 'Descripción de la subcategoría' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ description: 'Estado activo/inactivo' })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
