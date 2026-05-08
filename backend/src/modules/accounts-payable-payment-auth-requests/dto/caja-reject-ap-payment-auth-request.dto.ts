import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class CajaRejectApPaymentAuthRequestDto {
  @ApiPropertyOptional({ description: 'Motivo de rechazo de Caja' })
  @IsOptional()
  @IsString()
  reason?: string;
}
