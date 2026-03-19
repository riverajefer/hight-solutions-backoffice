import { IsString, IsNotEmpty, IsOptional, Matches, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateStepDefinitionDto {
  @ApiProperty({ example: 'Barnizado UV', description: 'Nombre descriptivo del paso' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @ApiProperty({
    example: 'BARNIZADO_UV',
    description: 'Código único del tipo de paso (MAYUSCULAS_GUION_BAJO)',
    pattern: '^[A-Z][A-Z0-9_]*$',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^[A-Z][A-Z0-9_]*$/, {
    message: 'El tipo debe estar en formato MAYUSCULAS_GUION_BAJO (ej: BARNIZADO_UV)',
  })
  @MaxLength(50)
  type: string;

  @ApiPropertyOptional({ example: 'Proceso de barnizado con UV para acabado brillante' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}
