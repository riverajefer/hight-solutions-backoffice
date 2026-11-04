import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class ReviewTransferRequestDto {
  @IsString()
  @IsOptional()
  @MaxLength(500)
  @ApiPropertyOptional({ description: 'Notas del admin (obligatorias al rechazar)', maxLength: 500 })
  reviewNotes?: string;
}
