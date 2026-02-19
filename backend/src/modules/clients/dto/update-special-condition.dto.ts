import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, MaxLength } from 'class-validator';

export class UpdateSpecialConditionDto {
  @ApiPropertyOptional({
    description: 'Condición especial del cliente',
    example: 'Cliente con descuento preferencial por volumen',
    maxLength: 500,
  })
  @IsString()
  @IsOptional()
  @MaxLength(500, { message: 'La condición especial no puede exceder 500 caracteres' })
  specialCondition?: string | null;
}
