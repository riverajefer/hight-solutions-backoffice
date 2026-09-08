import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { CreateQuoteDto } from './create-quote.dto';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
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
}
