import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class ApproveQuoteRestoreRequestDto {
  @ApiProperty({
    description: 'Notas del revisor (opcional)',
    example: 'Aprobado, el rechazo fue un error',
    required: false,
  })
  @IsOptional()
  @IsString()
  reviewNotes?: string;
}

export class RejectQuoteRestoreRequestDto {
  @ApiProperty({
    description: 'Notas del revisor explicando el rechazo',
    example: 'El cliente confirmó que no sigue con la cotización',
  })
  @IsString()
  reviewNotes: string;
}
