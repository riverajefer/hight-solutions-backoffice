import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class AdminApproveApPaymentAuthRequestDto {
  @ApiPropertyOptional({ description: 'Notas de aprobación del administrador' })
  @IsOptional()
  @IsString()
  adminNotes?: string;
}
