import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsEmail,
  IsUUID,
  IsEnum,
  MinLength,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { PersonType } from '../../../generated/prisma';

export class CreateSupplierDto {
  @ApiProperty({
    description: 'Nombre del proveedor',
    example: 'Distribuidora XYZ S.A.',
    minLength: 2,
    maxLength: 200,
  })
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  name: string;

  @ApiPropertyOptional({
    description: 'Nombre del encargado o persona de contacto',
    example: 'Juan Pérez',
    maxLength: 100,
  })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  encargado?: string;

  @ApiPropertyOptional({
    description: 'Teléfono celular de contacto',
    example: '3001234567',
    maxLength: 10,
  })
  @IsString()
  @IsOptional()
  @MaxLength(10)
  phone?: string;

  @ApiPropertyOptional({
    description: 'Teléfono fijo de contacto',
    example: '6011234567',
    maxLength: 10,
  })
  @IsString()
  @IsOptional()
  @MaxLength(10)
  landlinePhone?: string;

  @ApiPropertyOptional({
    description: 'Dirección física',
    example: 'Carrera 45 #12-34, Medellín',
    maxLength: 300,
  })
  @IsString()
  @IsOptional()
  @MaxLength(300)
  address?: string;

  @ApiProperty({
    description: 'Correo electrónico del proveedor',
    example: 'contacto@distribuidoraxyz.com',
  })
  @IsEmail({}, { message: 'El email debe tener un formato válido' })
  email: string;

  @ApiProperty({
    description: 'ID del departamento',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID('4', { message: 'El departamento debe ser un UUID válido' })
  departmentId: string;

  @ApiProperty({
    description: 'ID de la ciudad',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  @IsUUID('4', { message: 'La ciudad debe ser un UUID válido' })
  cityId: string;

  @ApiProperty({
    description: 'Tipo de persona',
    enum: PersonType,
    example: 'EMPRESA',
  })
  @IsEnum(PersonType, { message: 'El tipo de persona debe ser NATURAL o EMPRESA' })
  personType: PersonType;

  @ApiPropertyOptional({
    description: 'NIT o Cédula (requerido si el tipo de persona es EMPRESA o NATURAL)',
    example: '800.456.789-0',
    minLength: 5,
    maxLength: 20,
  })
  @IsString({ message: 'El NIT/Cédula es requerido' })
  @IsOptional() // Make it optional in the DTO but validated by logic if needed
  @MinLength(5, { message: 'El NIT/Cédula debe tener al menos 5 caracteres' })
  @MaxLength(20, { message: 'El NIT/Cédula no puede exceder 20 caracteres' })
  nit?: string;
}
