import {
  IsEnum,
  IsISO8601,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export enum EmployeeType {
  REGULAR = 'REGULAR',
  TEMPORARY = 'TEMPORARY',
}

export enum ContractType {
  FIXED_TERM = 'FIXED_TERM',
  INDEFINITE = 'INDEFINITE',
  SERVICE_CONTRACT = 'SERVICE_CONTRACT',
  INTERNSHIP = 'INTERNSHIP',
}

export enum IdentificationType {
  CC = 'CC',
  CE = 'CE',
  TI = 'TI',
  PA = 'PA',
  NIT = 'NIT',
}

export enum Sex {
  MALE = 'MALE',
  FEMALE = 'FEMALE',
  OTHER = 'OTHER',
}

export enum EmployeeStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
}

export class CreatePayrollEmployeeDto {
  @ApiPropertyOptional({
    description:
      'ID del usuario del sistema a vincular. Si se omite, se crea un usuario nuevo (rol "user") a partir de los datos personales y la contraseña.',
  })
  @IsUUID()
  @IsOptional()
  userId?: string;

  @ApiPropertyOptional({
    description: 'Contraseña del nuevo usuario del sistema (requerida si no se envía userId)',
    minLength: 6,
  })
  @IsString()
  @MinLength(6, { message: 'La contraseña debe tener al menos 6 caracteres' })
  @IsOptional()
  password?: string;

  @ApiPropertyOptional({ enum: EmployeeType, default: EmployeeType.REGULAR })
  @IsEnum(EmployeeType)
  @IsOptional()
  employeeType?: EmployeeType;

  @ApiPropertyOptional({ description: 'Salario mensual (para empleados REGULAR)', example: 2000000 })
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  @IsOptional()
  monthlySalary?: number;

  @ApiPropertyOptional({ description: 'Tarifa por día (para empleados TEMPORARY)', example: 70000 })
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  @IsOptional()
  dailyRate?: number;

  @ApiPropertyOptional({ description: 'ID del cargo laboral (modelo Cargo)', example: 'uuid-del-cargo' })
  @IsUUID()
  @IsOptional()
  cargoId?: string;

  @ApiProperty({ description: 'Fecha de ingreso a la empresa', example: '2024-01-15' })
  @IsISO8601()
  @IsNotEmpty()
  startDate: string;

  @ApiPropertyOptional({ description: 'Fecha de terminación del contrato', example: '2025-01-15' })
  @IsISO8601()
  @IsOptional()
  contractEndDate?: string;

  @ApiPropertyOptional({ enum: ContractType })
  @IsEnum(ContractType)
  @IsOptional()
  contractType?: ContractType;

  @ApiPropertyOptional({ enum: EmployeeStatus, default: EmployeeStatus.ACTIVE })
  @IsEnum(EmployeeStatus)
  @IsOptional()
  status?: EmployeeStatus;

  @ApiPropertyOptional({ description: 'Notas adicionales sobre el empleado' })
  @IsString()
  @IsOptional()
  notes?: string;

  // ─── Identificación ─────────────────────────────────────────────────────────
  @ApiPropertyOptional({ enum: IdentificationType, description: 'Tipo de identificación' })
  @IsEnum(IdentificationType)
  @IsOptional()
  identificationType?: IdentificationType;

  @ApiPropertyOptional({ description: 'Número de identificación', example: '1234567890' })
  @IsString()
  @IsOptional()
  identificationNumber?: string;

  @ApiPropertyOptional({ description: 'Fecha de expedición del documento', example: '2018-05-20' })
  @IsISO8601()
  @IsOptional()
  documentIssueDate?: string;

  // ─── Nombres ────────────────────────────────────────────────────────────────
  @ApiPropertyOptional({ description: 'Primer nombre' })
  @IsString()
  @IsOptional()
  firstName?: string;

  @ApiPropertyOptional({ description: 'Segundo nombre' })
  @IsString()
  @IsOptional()
  middleName?: string;

  @ApiPropertyOptional({ description: 'Primer apellido' })
  @IsString()
  @IsOptional()
  firstLastName?: string;

  @ApiPropertyOptional({ description: 'Segundo apellido' })
  @IsString()
  @IsOptional()
  secondLastName?: string;

  // ─── Datos personales ───────────────────────────────────────────────────────
  @ApiPropertyOptional({ enum: Sex, description: 'Sexo' })
  @IsEnum(Sex)
  @IsOptional()
  sex?: Sex;

  @ApiPropertyOptional({ description: 'Fecha de nacimiento', example: '1995-03-10' })
  @IsISO8601()
  @IsOptional()
  birthDate?: string;

  // ─── Contacto ───────────────────────────────────────────────────────────────
  @ApiPropertyOptional({ description: 'Dirección de residencia' })
  @IsString()
  @IsOptional()
  address?: string;

  @ApiPropertyOptional({ description: 'Barrio' })
  @IsString()
  @IsOptional()
  neighborhood?: string;

  @ApiPropertyOptional({ description: 'Teléfono' })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional({ description: 'Correo electrónico' })
  @IsString()
  @IsOptional()
  email?: string;

  // ─── Seguridad social ───────────────────────────────────────────────────────
  @ApiPropertyOptional({ description: 'EPS' })
  @IsString()
  @IsOptional()
  eps?: string;

  @ApiPropertyOptional({ description: 'Fondo de pensiones' })
  @IsString()
  @IsOptional()
  pensionFund?: string;

  // ─── Contacto de emergencia ─────────────────────────────────────────────────
  @ApiPropertyOptional({ description: 'Nombre del contacto de emergencia' })
  @IsString()
  @IsOptional()
  emergencyContactName?: string;

  @ApiPropertyOptional({ description: 'Parentesco del contacto de emergencia' })
  @IsString()
  @IsOptional()
  emergencyContactRelationship?: string;

  @ApiPropertyOptional({ description: 'Teléfono del contacto de emergencia' })
  @IsString()
  @IsOptional()
  emergencyContactPhone?: string;
}
