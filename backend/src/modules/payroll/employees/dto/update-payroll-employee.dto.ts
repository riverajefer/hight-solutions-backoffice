import {
  IsEnum,
  IsISO8601,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ContractType,
  EmployeeStatus,
  EmployeeType,
  IdentificationType,
  Sex,
} from './create-payroll-employee.dto';

export { EmployeeStatus };

export class UpdatePayrollEmployeeDto {
  @ApiPropertyOptional({ enum: EmployeeType })
  @IsEnum(EmployeeType)
  @IsOptional()
  employeeType?: EmployeeType;

  @ApiPropertyOptional({ description: 'Salario mensual', example: 2200000 })
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  @IsOptional()
  monthlySalary?: number;

  @ApiPropertyOptional({ description: 'Tarifa por día', example: 75000 })
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  @IsOptional()
  dailyRate?: number;

  @ApiPropertyOptional({ description: 'ID del cargo laboral (modelo Cargo)' })
  @IsUUID()
  @IsOptional()
  cargoId?: string;

  @ApiPropertyOptional({ description: 'Fecha de ingreso', example: '2024-01-15' })
  @IsISO8601()
  @IsOptional()
  startDate?: string;

  @ApiPropertyOptional({ description: 'Fecha de terminación del contrato', example: '2025-01-15' })
  @IsISO8601()
  @IsOptional()
  contractEndDate?: string | null;

  @ApiPropertyOptional({ enum: ContractType })
  @IsEnum(ContractType)
  @IsOptional()
  contractType?: ContractType;

  @ApiPropertyOptional({ enum: EmployeeStatus })
  @IsEnum(EmployeeStatus)
  @IsOptional()
  status?: EmployeeStatus;

  @ApiPropertyOptional({ description: 'Notas adicionales' })
  @IsString()
  @IsOptional()
  notes?: string;

  // ─── Identificación ─────────────────────────────────────────────────────────
  @ApiPropertyOptional({ enum: IdentificationType })
  @IsEnum(IdentificationType)
  @IsOptional()
  identificationType?: IdentificationType | null;

  @ApiPropertyOptional({ description: 'Número de identificación' })
  @IsString()
  @IsOptional()
  identificationNumber?: string | null;

  @ApiPropertyOptional({ description: 'Fecha de expedición del documento' })
  @IsISO8601()
  @IsOptional()
  documentIssueDate?: string | null;

  // ─── Nombres ────────────────────────────────────────────────────────────────
  @ApiPropertyOptional({ description: 'Primer nombre' })
  @IsString()
  @IsOptional()
  firstName?: string | null;

  @ApiPropertyOptional({ description: 'Segundo nombre' })
  @IsString()
  @IsOptional()
  middleName?: string | null;

  @ApiPropertyOptional({ description: 'Primer apellido' })
  @IsString()
  @IsOptional()
  firstLastName?: string | null;

  @ApiPropertyOptional({ description: 'Segundo apellido' })
  @IsString()
  @IsOptional()
  secondLastName?: string | null;

  // ─── Datos personales ───────────────────────────────────────────────────────
  @ApiPropertyOptional({ enum: Sex })
  @IsEnum(Sex)
  @IsOptional()
  sex?: Sex | null;

  @ApiPropertyOptional({ description: 'Fecha de nacimiento' })
  @IsISO8601()
  @IsOptional()
  birthDate?: string | null;

  // ─── Contacto ───────────────────────────────────────────────────────────────
  @ApiPropertyOptional({ description: 'Dirección de residencia' })
  @IsString()
  @IsOptional()
  address?: string | null;

  @ApiPropertyOptional({ description: 'Barrio' })
  @IsString()
  @IsOptional()
  neighborhood?: string | null;

  @ApiPropertyOptional({ description: 'Teléfono' })
  @IsString()
  @IsOptional()
  phone?: string | null;

  @ApiPropertyOptional({ description: 'Correo electrónico' })
  @IsString()
  @IsOptional()
  email?: string | null;

  // ─── Seguridad social ───────────────────────────────────────────────────────
  @ApiPropertyOptional({ description: 'EPS' })
  @IsString()
  @IsOptional()
  eps?: string | null;

  @ApiPropertyOptional({ description: 'Fondo de pensiones' })
  @IsString()
  @IsOptional()
  pensionFund?: string | null;

  // ─── Contacto de emergencia ─────────────────────────────────────────────────
  @ApiPropertyOptional({ description: 'Nombre del contacto de emergencia' })
  @IsString()
  @IsOptional()
  emergencyContactName?: string | null;

  @ApiPropertyOptional({ description: 'Parentesco del contacto de emergencia' })
  @IsString()
  @IsOptional()
  emergencyContactRelationship?: string | null;

  @ApiPropertyOptional({ description: 'Teléfono del contacto de emergencia' })
  @IsString()
  @IsOptional()
  emergencyContactPhone?: string | null;
}
