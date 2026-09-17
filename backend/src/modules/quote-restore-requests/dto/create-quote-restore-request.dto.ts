import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateQuoteRestoreRequestDto {
  @ApiProperty({
    description: 'ID de la cotización rechazada que se desea restaurar',
    example: 'uuid-here',
  })
  @IsNotEmpty()
  @IsString()
  quoteId: string;

  @ApiProperty({
    description: 'Motivo de la restauración',
    example: 'Se rechazó por error; el cliente sigue interesado',
  })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(10, { message: 'Explica el motivo (al menos 10 caracteres)' })
  @MaxLength(500)
  reason: string;
}
