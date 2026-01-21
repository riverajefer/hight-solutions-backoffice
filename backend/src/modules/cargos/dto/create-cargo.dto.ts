import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsUUID, MinLength, MaxLength } from 'class-validator';

export class CreateCargoDto {
  @ApiProperty({
    description: 'Nombre del cargo',
    example: 'Desarrollador Senior',
    minLength: 2,
    maxLength: 100,
  })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional({
    description: 'Descripción del cargo',
    example: 'Encargado del desarrollo de software y mentoría del equipo',
    maxLength: 500,
  })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string;

  @ApiProperty({
    description: 'ID del área a la que pertenece el cargo',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  areaId: string;
}
