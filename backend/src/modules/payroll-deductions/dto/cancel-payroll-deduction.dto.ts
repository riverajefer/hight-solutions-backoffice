import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export class CancelPayrollDeductionDto {
  @ApiProperty({
    description:
      'Motivo de la cancelación. Se usa cuando el descuento ya no debe ' +
      'ocurrir: el trabajo se devolvió, la orden se anuló o el empleado salió ' +
      'de la empresa.',
    example: 'La orden se anuló por reclamo de calidad',
  })
  @IsString()
  @IsNotEmpty({ message: 'El motivo de la cancelación es obligatorio' })
  @MinLength(5, { message: 'El motivo debe tener al menos 5 caracteres' })
  @MaxLength(500)
  cancelReason: string;
}
