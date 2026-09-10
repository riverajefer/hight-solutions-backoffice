import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { PayrollDeductionStatus } from '../../../generated/prisma';

export class FilterPayrollDeductionsDto {
  @ApiPropertyOptional({
    enum: PayrollDeductionStatus,
    description: 'Estado del descuento',
  })
  @IsOptional()
  @IsEnum(PayrollDeductionStatus)
  status?: PayrollDeductionStatus;

  @ApiPropertyOptional({ description: 'Filtrar por empleado' })
  @IsOptional()
  @IsString()
  employeeId?: string;

  @ApiPropertyOptional({
    description:
      'Filtrar por el periodo de nómina en el que se aplicó el descuento',
  })
  @IsOptional()
  @IsString()
  periodId?: string;

  @ApiPropertyOptional({
    description: 'Buscar por número de orden o nombre del empleado',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 25 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 25;

  // `enableImplicitConversion` convierte la cadena 'false' en `true`, así que el
  // booleano se fuerza a String antes de interpretarlo. Sin esto, desmarcar el
  // filtro en la UI equivale a activarlo.
  @ApiPropertyOptional({
    description: 'Solo los descuentos que todavía no se han aplicado',
  })
  @IsOptional()
  @Type(() => String)
  @Transform(({ value }) => value === 'true' || value === true)
  onlyPending?: boolean;
}
