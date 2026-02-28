import { IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class ApproveExpenseOrderAuthRequestDto {
  @ApiPropertyOptional({ description: 'Notas del revisor' })
  @IsOptional()
  @IsString()
  reviewNotes?: string;
}
