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

export class CreateClientDto {
  @ApiProperty({
    description: 'Nombre del cliente',
    example: 'Empresa ABC S.A.S.',
    minLength: 2,
    maxLength: 200,
  })
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  name: string;

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

  @ApiProperty({
    description: 'Correo electrónico del cliente',
    example: 'contacto@empresaabc.com',
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
    description: 'NIT (requerido si el tipo de persona es EMPRESA)',
    example: '900.123.456-7',
    minLength: 5,
    maxLength: 20,
  })
  @ValidateIf((o) => o.personType === PersonType.EMPRESA)
  @IsString({ message: 'El NIT es requerido para tipo EMPRESA' })
  @MinLength(5, { message: 'El NIT debe tener al menos 5 caracteres' })
  @MaxLength(20, { message: 'El NIT no puede exceder 20 caracteres' })
  nit?: string;
}
