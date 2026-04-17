import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RejectRefundRequestDto {
  @ApiProperty({ description: 'Motivo del rechazo (obligatorio)' })
  @IsString()
  @IsNotEmpty()
  reviewNotes: string;
}
