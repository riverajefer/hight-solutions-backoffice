import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsUUID } from 'class-validator';

export class CommercialQueryDto {
  @ApiPropertyOptional({
    description: 'Inicio del período (YYYY-MM-DD). Por defecto, el primer día del mes en curso',
  })
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiPropertyOptional({
    description: 'Fin del período (YYYY-MM-DD). Por defecto, el último día del mes en curso',
  })
  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @ApiPropertyOptional({
    description:
      'Acota el tablero a una asesora. Sin `read_all_advisors_tracking` solo se ' +
      'admite el propio id.',
  })
  @IsOptional()
  @IsUUID()
  advisorId?: string;
}
