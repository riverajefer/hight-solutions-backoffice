import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export class RejectPayrollDeductionDto {
  @ApiProperty({
    description:
      'Motivo del rechazo. Queda visible para el asesor, que debe cobrar la ' +
      'orden por otro medio.',
    example: 'El empleado ya tiene comprometida la quincena con un anticipo',
  })
  @IsString()
  @IsNotEmpty({ message: 'El motivo del rechazo es obligatorio' })
  @MinLength(5, { message: 'El motivo debe tener al menos 5 caracteres' })
  @MaxLength(500)
  rejectionReason: string;
}
