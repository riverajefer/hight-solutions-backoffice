import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class AdvisorTrackingQueryDto {
  @ApiPropertyOptional({ description: 'Mes (1-12). Por defecto, el mes actual', example: 8 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  month?: number;

  @ApiPropertyOptional({ description: 'Año. Por defecto, el año actual', example: 2026 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(2020)
  year?: number;

  @ApiPropertyOptional({
    description:
      'Acota el seguimiento a un asesor. Sin `read_all_advisors_tracking` solo se ' +
      'admite el propio id.',
  })
  @IsOptional()
  @IsUUID()
  advisorId?: string;
}
