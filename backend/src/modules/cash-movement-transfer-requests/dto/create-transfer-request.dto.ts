import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateTransferRequestDto {
  @IsString()
  @IsNotEmpty({ message: 'Escribe el motivo del traslado' })
  @MinLength(10, { message: 'El motivo debe tener al menos 10 caracteres' })
  @MaxLength(500, { message: 'El motivo no puede pasar de 500 caracteres' })
  @ApiProperty({
    description: 'Por qué el movimiento debe pasar a la caja de hoy',
    minLength: 10,
    maxLength: 500,
  })
  reason: string;

  @IsBoolean()
  @ApiProperty({
    description:
      '¿El dinero se quedó en la caja ese día? Si es false, la solicitud no se crea: es un faltante.',
  })
  cashStayedInDrawer: boolean;
}
