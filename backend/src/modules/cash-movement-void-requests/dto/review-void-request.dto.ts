import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class ReviewVoidRequestDto {
  @IsString()
  @IsOptional()
  @MaxLength(500)
  @ApiPropertyOptional({
    description: 'Notas del revisor (admin)',
    maxLength: 500,
  })
  reviewNotes?: string;
}
