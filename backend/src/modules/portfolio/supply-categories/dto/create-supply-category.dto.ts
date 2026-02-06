import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, MinLength, MaxLength, IsInt, Min } from 'class-validator';

export class CreateSupplyCategoryDto {
  @ApiProperty({
    description: 'Nombre de la categoría de insumo',
    example: 'Telas y Lonas',
    minLength: 2,
    maxLength: 100,
  })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional({
    description: 'Slug único (URL-friendly). Se autogenera a partir del nombre si no se proporciona.',
    example: 'telas-y-lonas',
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
    example: 'Materiales textiles y lonas para impresión',
    maxLength: 500,
  })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({
    description: 'Icono o emoji',
    example: '🧵',
    maxLength: 50,
  })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  icon?: string;

  @ApiPropertyOptional({
    description: 'Orden de visualización',
    example: 1,
  })
  @IsInt()
  @IsOptional()
  @Min(0)
  sortOrder?: number;
}
