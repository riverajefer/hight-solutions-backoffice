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
    description: 'Nombre del representante legal (para empresas)',
    example: 'Juan Pérez',
    maxLength: 200,
  })
  @IsString()
  @IsOptional()
  @MaxLength(200)
  manager?: string;

  @ApiPropertyOptional({
    description: 'Nombre del encargado o persona de contacto',
    example: 'María González',
    maxLength: 200,
  })
  @IsString()
  @IsOptional()
  @MaxLength(200)
  encargado?: string;

  @ApiPropertyOptional({
    description: 'Número de celular',
    example: '3001234567',
    minLength: 10,
    maxLength: 10,
  })
  @IsString()
  @IsOptional()
  @MinLength(10, { message: 'El número de celular debe tener exactamente 10 dígitos' })
  @MaxLength(10, { message: 'El número de celular no puede exceder 10 dígitos' })
  phone?: string;

  @ApiPropertyOptional({
    description: 'Teléfono fijo',
    example: '6012345678',
    maxLength: 20,
  })
  @IsString()
  @IsOptional()
  @MinLength(10, { message: 'El teléfono fijo debe tener exactamente 10 dígitos' })
  @MaxLength(10, { message: 'El teléfono fijo debe tener exactamente 10 dígitos' })
  landlinePhone?: string;

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
    description: 'NIT (para empresas)',
    example: '900.123.456-7',
    minLength: 5,
    maxLength: 20,
  })
  @IsString()
  @IsOptional()
  @MinLength(5, { message: 'El NIT debe tener al menos 5 caracteres' })
  @MaxLength(12, { message: 'El NIT no puede exceder 12 caracteres' })
  nit?: string;

  @ApiPropertyOptional({
    description: 'Cédula de ciudadanía (para personas naturales)',
    example: '1234567890',
    minLength: 6,
    maxLength: 15,
  })
  @IsString()
  @IsOptional()
  @MinLength(6, { message: 'La cédula debe tener al menos 6 caracteres' })
  @MaxLength(10, { message: 'La cédula no puede exceder 10 dígitos' })
  cedula?: string;

  @ApiPropertyOptional({
    description: 'Estado activo del cliente',
    example: true,
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiPropertyOptional({
    description: 'Condición especial del cliente (solo editable por administradores)',
    example: 'Cliente con descuento preferencial por volumen',
    maxLength: 500,
  })
  @IsString()
  @IsOptional()
  @MaxLength(500, { message: 'La condición especial no puede exceder 500 caracteres' })
  specialCondition?: string;
}
