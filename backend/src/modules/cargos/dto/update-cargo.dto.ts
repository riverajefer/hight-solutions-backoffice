import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean, IsUUID, MinLength, MaxLength } from 'class-validator';

export class UpdateCargoDto {
  @ApiPropertyOptional({
    description: 'Nombre del cargo',
    example: 'Desarrollador Senior',
    minLength: 2,
    maxLength: 100,
  })
  @IsString()
  @IsOptional()
  @MinLength(2)
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({
    description: 'Descripción del cargo',
    example: 'Encargado del desarrollo de software y mentoría del equipo',
    maxLength: 500,
  })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({
    description: 'ID del área a la que pertenece el cargo',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  @IsOptional()
  areaId?: string;

  @ApiPropertyOptional({
    description: 'Estado activo del cargo',
    example: true,
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
