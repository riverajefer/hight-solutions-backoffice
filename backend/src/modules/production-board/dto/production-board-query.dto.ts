import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';
import { BOARD_DEFAULT_DAYS, BOARD_MAX_DAYS } from '../production-board.constants';

export class ProductionBoardQueryDto {
  @ApiPropertyOptional({
    description: 'Ventana del tablero en días hacia atrás, por fecha de la orden',
    default: BOARD_DEFAULT_DAYS,
    minimum: 1,
    maximum: BOARD_MAX_DAYS,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(BOARD_MAX_DAYS)
  days?: number;
}
