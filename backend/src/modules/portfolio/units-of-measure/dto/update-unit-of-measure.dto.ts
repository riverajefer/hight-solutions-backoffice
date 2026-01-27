import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, MinLength, MaxLength } from 'class-validator';

export class UpdateUnitOfMeasureDto {
  @ApiPropertyOptional({
    description: 'Nombre de la unidad de medida',
    minLength: 1,
    maxLength: 50,
  })
  @IsString()
  @IsOptional()
  @MinLength(1)
  @MaxLength(50)
  name?: string;

  @ApiPropertyOptional({
    description: 'Abreviatura de la unidad',
    minLength: 1,
    maxLength: 10,
  })
  @IsString()
  @IsOptional()
  @MinLength(1)
  @MaxLength(10)
  abbreviation?: string;

  @ApiPropertyOptional({
    description: 'Descripción de la unidad de medida',
    maxLength: 500,
  })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string;
}
