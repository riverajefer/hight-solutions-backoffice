import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean, MinLength, MaxLength } from 'class-validator';

export class UpdateAreaDto {
  @ApiPropertyOptional({
    description: 'Nombre del área',
    example: 'Tecnología',
    minLength: 2,
    maxLength: 100,
  })
  @IsString()
  @IsOptional()
  @MinLength(2)
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({
    description: 'Descripción del área',
    example: 'Área encargada de desarrollo y soporte tecnológico',
    maxLength: 500,
  })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({
    description: 'Estado activo del área',
    example: true,
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
