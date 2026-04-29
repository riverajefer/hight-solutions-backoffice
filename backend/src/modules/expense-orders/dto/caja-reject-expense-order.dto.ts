import { IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CajaRejectExpenseOrderDto {
  @ApiProperty({ description: 'Motivo del rechazo de Caja', example: 'Documentación incompleta' })
  @IsString()
  @MinLength(5, { message: 'El motivo debe tener al menos 5 caracteres' })
  reason: string;
}
