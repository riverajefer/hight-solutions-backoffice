import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class ApproveAdvisorChangeRequestDto {
  @ApiProperty({
    description: 'Notas del revisor (opcional)',
    example: 'Aprobado, reasignación correcta',
    required: false,
  })
  @IsOptional()
  @IsString()
  reviewNotes?: string;
}

export class RejectAdvisorChangeRequestDto {
  @ApiProperty({
    description: 'Notas del revisor explicando el rechazo',
    example: 'El asesor destino no corresponde a esta cuenta',
  })
  @IsString()
  reviewNotes: string;
}
