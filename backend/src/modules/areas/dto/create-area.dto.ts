import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, MinLength, MaxLength } from 'class-validator';

export class CreateAreaDto {
  @ApiProperty({
    description: 'Nombre del área',
    example: 'Tecnología',
    minLength: 2,
    maxLength: 100,
  })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional({
    description: 'Descripción del área',
    example: 'Área encargada de desarrollo y soporte tecnológico',
    maxLength: 500,
  })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string;
}
