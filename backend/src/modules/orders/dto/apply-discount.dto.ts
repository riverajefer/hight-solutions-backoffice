import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsString, Min } from 'class-validator';

export class ApplyDiscountDto {
  @ApiProperty({
    description: 'Monto del descuento',
    example: 50000,
    minimum: 0.01,
  })
  @IsNotEmpty({ message: 'El monto del descuento es requerido' })
  @IsNumber({}, { message: 'El monto debe ser un número válido' })
  @Min(0.01, { message: 'El monto del descuento debe ser mayor a 0' })
  amount: number;

  @ApiProperty({
    description: 'Motivo o razón del descuento (obligatorio)',
    example: 'Compensación por insatisfacción del cliente',
    minLength: 5,
  })
  @IsNotEmpty({ message: 'El motivo del descuento es requerido' })
  @IsString({ message: 'El motivo debe ser un texto válido' })
  reason: string;
}
