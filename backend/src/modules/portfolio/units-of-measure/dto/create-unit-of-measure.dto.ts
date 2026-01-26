import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, MinLength, MaxLength } from 'class-validator';

export class CreateUnitOfMeasureDto {
  @ApiProperty({
    description: 'Nombre de la unidad de medida',
    example: 'metro',
    minLength: 1,
    maxLength: 50,
  })
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  name: string;

  @ApiProperty({
    description: 'Abreviatura de la unidad',
    example: 'm',
    minLength: 1,
    maxLength: 10,
  })
  @IsString()
  @MinLength(1)
  @MaxLength(10)
  abbreviation: string;

  @ApiPropertyOptional({
    description: 'Descripción de la unidad de medida',
    example: 'Unidad de longitud del sistema internacional',
    maxLength: 500,
  })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string;
}
