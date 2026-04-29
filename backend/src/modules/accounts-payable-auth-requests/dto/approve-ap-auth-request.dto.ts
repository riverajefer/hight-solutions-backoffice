import { IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class ApproveApAuthRequestDto {
  @ApiPropertyOptional({ description: 'Notas de aprobación' })
  @IsOptional()
  @IsString()
  reviewNotes?: string;
}
