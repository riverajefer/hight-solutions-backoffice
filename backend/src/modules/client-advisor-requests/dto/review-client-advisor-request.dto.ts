import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class ApproveClientAdvisorRequestDto {
  @ApiProperty({
    description: 'Notas del revisor (opcional)',
    example: 'Aprobado, asesor correcto para este cliente',
    required: false,
  })
  @IsOptional()
  @IsString()
  reviewNotes?: string;
}

export class RejectClientAdvisorRequestDto {
  @ApiProperty({
    description: 'Notas del revisor explicando el rechazo',
    example: 'Este asesor no corresponde a este cliente',
  })
  @IsNotEmpty()
  @IsString()
  reviewNotes: string;
}
