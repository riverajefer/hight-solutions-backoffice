import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class VoidSupplyLotDto {
  @ApiProperty({ description: 'Motivo (anulación o cierre del lote)', example: 'Se registró con el largo equivocado' })
  @IsString()
  @MinLength(5)
  @MaxLength(500)
  reason: string;
}
