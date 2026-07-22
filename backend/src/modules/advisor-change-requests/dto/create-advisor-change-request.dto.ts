import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateAdvisorChangeRequestDto {
  @ApiProperty({
    description: 'ID de la orden (OP) cuyo asesor se desea cambiar',
    example: 'uuid-here',
  })
  @IsNotEmpty()
  @IsString()
  orderId: string;

  @ApiProperty({
    description: 'ID del usuario que quedará como nuevo asesor de la OP',
    example: 'uuid-here',
  })
  @IsNotEmpty()
  @IsString()
  requestedAdvisorId: string;

  @ApiProperty({
    description: 'Razón del cambio de asesor (opcional)',
    example: 'El asesor original ya no trabaja en la empresa',
    required: false,
  })
  @IsOptional()
  @IsString()
  reason?: string;
}
