import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, MinLength, MaxLength, IsInt, Min } from 'class-validator';

export class UpdateSupplyCategoryDto {
  @ApiPropertyOptional({
    description: 'Nombre de la categoría de insumo',
    minLength: 2,
    maxLength: 100,
  })
  @IsString()
  @IsOptional()
  @MinLength(2)
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({
    description: 'Slug único (URL-friendly)',
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
    description: 'Icono o emoji',
    maxLength: 50,
  })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  icon?: string;

  @ApiPropertyOptional({
    description: 'Orden de visualización',
  })
  @IsInt()
  @IsOptional()
  @Min(0)
  sortOrder?: number;
}
