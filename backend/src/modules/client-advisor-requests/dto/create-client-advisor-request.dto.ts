import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateClientAdvisorRequestDto {
  @ApiProperty({
    description: 'ID del cliente al que se desea asignar el asesor',
    example: 'uuid-here',
  })
  @IsNotEmpty()
  @IsUUID('4', { message: 'El cliente debe ser un UUID válido' })
  clientId: string;

  @ApiProperty({
    description: 'ID del usuario que se desea asignar como asesor del cliente',
    example: 'uuid-here',
  })
  @IsNotEmpty()
  @IsUUID('4', { message: 'El asesor debe ser un UUID válido' })
  requestedAdvisorId: string;

  @ApiProperty({
    description: 'Razón de la asignación (opcional)',
    example: 'Soy el asesor especializado en DTF para este cliente',
    required: false,
  })
  @IsOptional()
  @IsString()
  reason?: string;
}
