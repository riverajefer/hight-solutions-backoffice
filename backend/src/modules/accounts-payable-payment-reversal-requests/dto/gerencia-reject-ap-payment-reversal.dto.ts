import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class GerenciaRejectApPaymentReversalDto {
  @ApiPropertyOptional({ description: 'Notas de rechazo de Gerencia' })
  @IsOptional()
  @IsString()
  rejectionNotes?: string;
}
