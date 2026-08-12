import { IsISO8601, IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * Datos del periodo destino al clonar. El resto de la configuración
 * (tipo de periodo, tarifas de horas extra y notas) se hereda del origen.
 */
export class ClonePayrollPeriodDto {
  @ApiProperty({ description: 'Nombre del nuevo periodo', example: '2 QUINCENA ENERO 2026' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: 'Fecha de inicio', example: '2026-01-16' })
  @IsISO8601()
  @IsNotEmpty()
  startDate: string;

  @ApiProperty({ description: 'Fecha de fin', example: '2026-01-31' })
  @IsISO8601()
  @IsNotEmpty()
  endDate: string;
}
