import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class VoidCashMovementDto {
  @ApiProperty({ description: 'Motivo de la anulación', maxLength: 500 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  voidReason: string;
}
