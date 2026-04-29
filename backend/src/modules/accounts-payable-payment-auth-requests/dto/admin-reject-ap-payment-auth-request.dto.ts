import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class AdminRejectApPaymentAuthRequestDto {
  @ApiPropertyOptional({ description: 'Motivo de rechazo' })
  @IsOptional()
  @IsString()
  adminNotes?: string;
}
