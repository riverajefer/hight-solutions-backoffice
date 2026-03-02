import { IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class RejectExpenseOrderAuthRequestDto {
  @ApiPropertyOptional({ description: 'Motivo del rechazo' })
  @IsOptional()
  @IsString()
  reviewNotes?: string;
}
