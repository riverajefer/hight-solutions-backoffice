import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateCashRegisterDto {
  @ApiProperty({ description: 'Nombre único de la caja registradora', example: 'Caja Principal' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional({ description: 'Descripción de la caja', example: 'Caja ubicada en recepción' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({ description: 'Estado activo/inactivo', default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
