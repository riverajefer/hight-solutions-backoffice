import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class CancelAccountPayableDto {
  @ApiProperty({ description: 'Razón de la anulación', minLength: 5 })
  @IsString()
  @IsNotEmpty()
  @MinLength(5)
  cancelReason: string;
}
