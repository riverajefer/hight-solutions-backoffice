import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';
import { ContactMedium, ContactOutcome } from '../../../generated/prisma';

/** Un toque comercial: por qué medio, cuándo y con qué resultado. */
export class CreateProspectContactDto {
  @ApiProperty({ description: 'Fecha en que se hizo el contacto' })
  @IsDateString()
  contactDate: string;

  @ApiProperty({ enum: ContactMedium })
  @IsEnum(ContactMedium)
  medium: ContactMedium;

  @ApiPropertyOptional({
    enum: ContactOutcome,
    description: 'Resultado del contacto. Alimenta la tasa de respuesta.',
  })
  @IsOptional()
  @IsEnum(ContactOutcome)
  outcome?: ContactOutcome;

  @ApiPropertyOptional({ description: 'Nota libre sobre el contacto' })
  @IsOptional()
  @IsString()
  note?: string;
}
