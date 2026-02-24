import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsUUID, MaxLength } from 'class-validator';

export class CreateExpenseSubcategoryDto {
  @ApiProperty({ description: 'ID del tipo de gasto padre' })
  @IsUUID()
  @IsNotEmpty()
  expenseTypeId: string;

  @ApiProperty({ example: 'Insumos internos', description: 'Nombre de la subcategoría' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional({ description: 'Descripción de la subcategoría' })
  @IsString()
  @IsOptional()
  description?: string;
}
