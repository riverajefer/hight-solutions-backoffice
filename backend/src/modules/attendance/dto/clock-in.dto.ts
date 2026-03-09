import { ApiPropertyOptional } from '@nestjs/swagger';

export class ClockInDto {
  // No fields required — userId comes from JWT
  @ApiPropertyOptional({ description: 'Nota opcional al marcar entrada' })
  notes?: string;
}
