import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsEmail,
  IsUUID,
  IsEnum,
  IsBoolean,
  MinLength,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { PersonType } from '../../../generated/prisma';

export class UpdateClientDto {
  @ApiPropertyOptional({
    description: 'Nombre del cliente',
    example: 'Empresa ABC S.A.S.',
    minLength: 2,
    maxLength: 200,
  })
  @IsString()
  @IsOptional()
  @MinLength(2)
  @MaxLength(200)
  name?: string;

  @ApiPropertyOptional({
    description: 'Nombre del encargado o gerente',
    example: 'Juan Pérez',
    maxLength: 200,
  })
  @IsString()
  @IsOptional()
  @MaxLength(200)
  manager?: string;

  @ApiPropertyOptional({
    description: 'Teléfono de contacto',
    example: '+57 300 123 4567',
    maxLength: 20,
  })
  @IsString()
  @IsOptional()
  @MaxLength(20)
  phone?: string;

  @ApiPropertyOptional({
    description: 'Dirección física',
    example: 'Calle 123 #45-67, Bogotá',
    maxLength: 300,
  })
  @IsString()
  @IsOptional()
  @MaxLength(300)
  address?: string;

  @ApiPropertyOptional({
    description: 'Correo electrónico del cliente',
    example: 'contacto@empresaabc.com',
  })
  @IsEmail({}, { message: 'El email debe tener un formato válido' })
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({
    description: 'ID del departamento',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID('4', { message: 'El departamento debe ser un UUID válido' })
  @IsOptional()
  departmentId?: string;

  @ApiPropertyOptional({
    description: 'ID de la ciudad',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  @IsUUID('4', { message: 'La ciudad debe ser un UUID válido' })
  @IsOptional()
  cityId?: string;

  @ApiPropertyOptional({
    description: 'Tipo de persona',
    enum: PersonType,
    example: 'EMPRESA',
  })
  @IsEnum(PersonType, { message: 'El tipo de persona debe ser NATURAL o EMPRESA' })
  @IsOptional()
  personType?: PersonType;

  @ApiPropertyOptional({
    description: 'NIT (requerido si el tipo de persona es EMPRESA)',
    example: '900.123.456-7',
    minLength: 5,
    maxLength: 20,
  })
  @ValidateIf((o) => o.personType === PersonType.EMPRESA)
  @IsString({ message: 'El NIT es requerido para tipo EMPRESA' })
  @MinLength(5, { message: 'El NIT debe tener al menos 5 caracteres' })
  @MaxLength(20, { message: 'El NIT no puede exceder 20 caracteres' })
  @IsOptional()
  nit?: string;

  @ApiPropertyOptional({
    description: 'Estado activo del cliente',
    example: true,
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
