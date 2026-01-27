import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  MinLength,
  MaxLength,
  IsUUID,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateServiceDto {
  @ApiPropertyOptional({
    description: 'Nombre del servicio',
    minLength: 2,
    maxLength: 150,
  })
  @IsString()
  @IsOptional()
  @MinLength(2)
  @MaxLength(150)
  name?: string;

  @ApiPropertyOptional({
    description: 'Slug único (URL-friendly)',
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
    maxLength: 1000,
  })
  @IsString()
  @IsOptional()
  @MaxLength(1000)
  description?: string;

  @ApiPropertyOptional({
    description: 'Precio base del servicio',
    type: 'number',
  })
  @IsOptional()
  @Type(() => Number)
  @Min(0)
  basePrice?: number;

  @ApiPropertyOptional({
    description: 'Unidad de precio',
    maxLength: 50,
  })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  priceUnit?: string;

  @ApiPropertyOptional({
    description: 'ID de la categoría del servicio',
  })
  @IsUUID()
  @IsOptional()
  categoryId?: string;
}
