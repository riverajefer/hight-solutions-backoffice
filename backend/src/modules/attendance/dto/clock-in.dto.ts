import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsObject } from 'class-validator';

export class ClockInDto {
  // No fields required — userId comes from JWT
  @ApiPropertyOptional({ description: 'Nota opcional al marcar entrada' })
  @IsOptional()
  notes?: string;

  @ApiPropertyOptional({ description: 'Metadatos sobre el dispositivo y ubicación' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
