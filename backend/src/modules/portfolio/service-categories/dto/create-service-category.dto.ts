import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  MinLength,
  MaxLength,
  IsInt,
  Min,
} from 'class-validator';

export class CreateServiceCategoryDto {
  @ApiProperty({
    description: 'Nombre de la categoría de servicio',
    example: 'Impresión Gran Formato',
    minLength: 2,
    maxLength: 100,
  })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional({
    description: 'Slug único para la categoría (URL-friendly). Se autogenera a partir del nombre si no se proporciona.',
    example: 'impresion-gran-formato',
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
    example: 'Servicios de impresión en gran formato como pendones, banners y vallas',
    maxLength: 500,
  })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({
    description: 'Icono o emoji para la categoría',
    example: '🖨️',
    maxLength: 50,
  })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  icon?: string;

  @ApiPropertyOptional({
    description: 'Orden de visualización',
    example: 1,
    minimum: 0,
    default: 0,
  })
  @IsInt()
  @IsOptional()
  @Min(0)
  sortOrder?: number;
}
