import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class CajaRejectApPaymentReversalDto {
  @ApiPropertyOptional({ description: 'Notas de rechazo de Caja' })
  @IsOptional()
  @IsString()
  rejectionNotes?: string;
}
