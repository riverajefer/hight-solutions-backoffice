import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreatePayrollItemDto {
  @ApiProperty({ description: 'ID del empleado' })
  @IsUUID()
  @IsNotEmpty()
  employeeId: string;

  @ApiPropertyOptional({ description: 'Días trabajados', example: 15 })
  @IsNumber()
  @Type(() => Number)
  @IsOptional()
  daysWorked?: number;

  @ApiProperty({ description: 'Salario base proporcional calculado', example: 1000000 })
  @IsNumber()
  @Type(() => Number)
  @IsNotEmpty()
  baseSalary: number;

  @ApiPropertyOptional({ description: 'Horas extras diurnas', example: 3.75 })
  @IsNumber()
  @Type(() => Number)
  @IsOptional()
  overtimeDaytimeHours?: number;

  @ApiPropertyOptional({ description: 'Horas extras nocturnas', example: 4 })
  @IsNumber()
  @Type(() => Number)
  @IsOptional()
  overtimeNighttimeHours?: number;

  @ApiPropertyOptional({ description: 'Valor horas extras diurnas', example: 37312.5 })
  @IsNumber()
  @Type(() => Number)
  @IsOptional()
  overtimeDaytimeValue?: number;

  @ApiPropertyOptional({ description: 'Valor horas extras nocturnas', example: 55600 })
  @IsNumber()
  @Type(() => Number)
  @IsOptional()
  overtimeNighttimeValue?: number;

  @ApiPropertyOptional({ description: 'Comisiones', example: 0 })
  @IsNumber()
  @Type(() => Number)
  @IsOptional()
  commissions?: number;

  @ApiPropertyOptional({ description: 'Valor día de descanso/vacaciones', example: 0 })
  @IsNumber()
  @Type(() => Number)
  @IsOptional()
  restDayValue?: number;

  @ApiPropertyOptional({ description: 'Auxilio de transporte', example: 0 })
  @IsNumber()
  @Type(() => Number)
  @IsOptional()
  transportAllowance?: number;

  @ApiPropertyOptional({ description: 'Descuento día laboral', example: 0 })
  @IsNumber()
  @Type(() => Number)
  @IsOptional()
  workdayDiscount?: number;

  @ApiPropertyOptional({ description: 'Préstamos a descontar', example: 0 })
  @IsNumber()
  @Type(() => Number)
  @IsOptional()
  loans?: number;

  @ApiPropertyOptional({ description: 'Anticipos a descontar', example: 100000 })
  @IsNumber()
  @Type(() => Number)
  @IsOptional()
  advances?: number;

  @ApiPropertyOptional({ description: 'Valor días no remunerados e incapacidad', example: 0 })
  @IsNumber()
  @Type(() => Number)
  @IsOptional()
  nonPaidDays?: number;

  @ApiPropertyOptional({ description: 'Descuento EPS y pensión', example: 70036 })
  @IsNumber()
  @Type(() => Number)
  @IsOptional()
  epsAndPensionDiscount?: number;

  @ApiProperty({ description: 'Total a pagar', example: 929964 })
  @IsNumber()
  @Type(() => Number)
  @IsNotEmpty()
  totalPayment: number;

  @ApiPropertyOptional({ description: 'Observaciones de nómina' })
  @IsString()
  @IsOptional()
  observations?: string;
}
