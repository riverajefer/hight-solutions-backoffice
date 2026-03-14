import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class ApproveStatusChangeRequestDto {
  @ApiProperty({
    description: 'Notas del revisor (opcional)',
    example: 'Aprobado por cliente confiable',
    required: false,
  })
  @IsOptional()
  @IsString()
  reviewNotes?: string;
}

export class RejectStatusChangeRequestDto {
  @ApiProperty({
    description: 'Notas del revisor explicando el rechazo',
    example: 'Cliente tiene deudas pendientes',
  })
  @IsString()
  reviewNotes: string;
}
