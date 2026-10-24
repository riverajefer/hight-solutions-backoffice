import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { CreateQuoteDto } from './create-quote.dto';
import { IsDateString, IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { QuoteStatus } from '../../../generated/prisma';

export class UpdateQuoteDto extends PartialType(CreateQuoteDto) {
  @IsOptional()
  @IsEnum(QuoteStatus)
  status?: QuoteStatus;

  @ApiPropertyOptional({
    description: 'Motivo del rechazo. Obligatorio al pasar la cotización a REJECTED.',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  rejectionReason?: string;

  @ApiPropertyOptional({
    description:
      'Fecha y hora de entrega de la OP que se crea. Obligatoria al pasar la cotización a CONVERTED.',
    example: '2025-02-15T15:00:00.000Z',
  })
  @IsOptional()
  @IsDateString()
  deliveryDate?: string;
}
