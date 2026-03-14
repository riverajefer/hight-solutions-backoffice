import { IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class ApproveClientOwnershipAuthRequestDto {
  @ApiPropertyOptional({ description: 'Notas de revisión (opcional)', maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reviewNotes?: string;
}
