import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  MinLength,
  MaxLength,
  IsUUID,
  IsDecimal,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateServiceDto {
  @ApiProperty({
    description: 'Nombre del servicio',
    example: 'Pendón 80x200 cm',
    minLength: 2,
    maxLength: 150,
  })
  @IsString()
  @MinLength(2)
  @MaxLength(150)
  name: string;

  @ApiPropertyOptional({
    description: 'Slug único (URL-friendly). Se autogenera a partir del nombre si no se proporciona.',
    example: 'pendon-80x200-cm',
    minLength: 2,
    maxLength: 150,
  })
  @IsString()
  @IsOptional()
  @MinLength(2)
  @MaxLength(150)
  slug?: string;

  @ApiPropertyOptional({
    description: 'Descripción del servicio',
    example: 'Impresión de pendón en lona mate de alta calidad',
    maxLength: 1000,
  })
  @IsString()
  @IsOptional()
  @MaxLength(1000)
  description?: string;

  @ApiPropertyOptional({
    description: 'Precio base del servicio',
    example: 45000,
    type: 'number',
  })
  @IsOptional()
  @Type(() => Number)
  @Min(0)
  basePrice?: number;

  @ApiPropertyOptional({
    description: 'Unidad de precio',
    example: 'por unidad',
    maxLength: 50,
  })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  priceUnit?: string;

  @ApiProperty({
    description: 'ID de la categoría del servicio',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  categoryId: string;
}
