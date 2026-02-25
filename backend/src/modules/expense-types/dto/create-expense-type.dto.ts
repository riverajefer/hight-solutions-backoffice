import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, MaxLength } from 'class-validator';

export class CreateExpenseTypeDto {
  @ApiProperty({ example: 'Operativos', description: 'Nombre del tipo de gasto' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional({ description: 'Descripción del tipo de gasto' })
  @IsString()
  @IsOptional()
  description?: string;
}
