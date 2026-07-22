import { PartialType } from '@nestjs/swagger';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUUID } from 'class-validator';
import { CreateProspectDto } from './create-prospect.dto';

export class UpdateProspectDto extends PartialType(CreateProspectDto) {
  @ApiPropertyOptional({
    description:
      'Cotización generada a partir del prospecto. Lo envía el formulario de cotización tras crearla.',
  })
  @IsOptional()
  @IsUUID()
  quoteId?: string;

  @ApiPropertyOptional({ description: 'Orden generada a partir del prospecto' })
  @IsOptional()
  @IsUUID()
  orderId?: string;

  @ApiPropertyOptional({ description: 'Cliente vinculado al prospecto' })
  @IsOptional()
  @IsUUID()
  clientId?: string;
}
