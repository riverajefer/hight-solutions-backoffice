import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  MinLength,
  MaxLength,
  IsInt,
  Min,
} from 'class-validator';

export class UpdateProductCategoryDto {
  @ApiPropertyOptional({
    description: 'Nombre de la categoría de producto',
    minLength: 2,
    maxLength: 100,
  })
  @IsString()
  @IsOptional()
  @MinLength(2)
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({
    description: 'Slug único para la categoría (URL-friendly)',
    minLength: 2,
    maxLength: 100,
  })
  @IsString()
  @IsOptional()
  @MinLength(2)
  @MaxLength(100)
  slug?: string;

  @ApiPropertyOptional({
    description: 'Descripción de la categoría',
    maxLength: 500,
  })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({
    description: 'Icono o emoji para la categoría',
    maxLength: 50,
  })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  icon?: string;

  @ApiPropertyOptional({
    description: 'Orden de visualización',
    minimum: 0,
  })
  @IsInt()
  @IsOptional()
  @Min(0)
  sortOrder?: number;
}
