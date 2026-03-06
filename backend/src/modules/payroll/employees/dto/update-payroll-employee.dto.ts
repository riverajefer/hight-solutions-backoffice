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
import { ContractType, EmployeeType } from './create-payroll-employee.dto';

export enum EmployeeStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
}

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
}
