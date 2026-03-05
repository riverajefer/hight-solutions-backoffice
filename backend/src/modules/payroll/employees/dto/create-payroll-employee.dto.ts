import {
  IsEnum,
  IsISO8601,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
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

export class CreatePayrollEmployeeDto {
  @ApiProperty({ description: 'ID del usuario del sistema a vincular como empleado' })
  @IsUUID()
  @IsNotEmpty()
  userId: string;

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

  @ApiPropertyOptional({ description: 'Cargo o rol laboral (texto libre)', example: 'Diseñadora' })
  @IsString()
  @IsOptional()
  jobTitle?: string;

  @ApiProperty({ description: 'Fecha de ingreso a la empresa', example: '2024-01-15' })
  @IsISO8601()
  @IsNotEmpty()
  startDate: string;

  @ApiPropertyOptional({ enum: ContractType })
  @IsEnum(ContractType)
  @IsOptional()
  contractType?: ContractType;

  @ApiPropertyOptional({ description: 'Notas adicionales sobre el empleado' })
  @IsString()
  @IsOptional()
  notes?: string;
}
