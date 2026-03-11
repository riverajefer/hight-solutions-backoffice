import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RejectClientOwnershipAuthRequestDto {
  @ApiProperty({ description: 'Motivo del rechazo (obligatorio)', maxLength: 500 })
  @IsNotEmpty()
  @IsString()
  @MaxLength(500)
  reviewNotes: string;
}
