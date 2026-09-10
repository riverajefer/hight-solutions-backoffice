import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class ApplyPayrollDeductionDto {
  @ApiProperty({
    description:
      'Periodo de nómina sobre el que se aplica el descuento. El empleado ya ' +
      'debe tener un registro en ese periodo.',
  })
  @IsString()
  @IsNotEmpty({ message: 'El periodo de nómina es obligatorio' })
  periodId: string;

  @ApiPropertyOptional({
    description:
      'Llave de idempotencia del diálogo. Dos clics sobre el mismo botón mandan ' +
      'la misma llave y el segundo devuelve el descuento ya aplicado en vez de ' +
      'descontarle dos veces al empleado.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  idempotencyKey?: string;
}
