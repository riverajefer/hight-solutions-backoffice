import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsUUID } from 'class-validator';

export enum ProspectConversionTarget {
  QUOTE = 'QUOTE',
  ORDER = 'ORDER',
}

/**
 * El prospecto guarda datos sueltos (a veces solo un celular), pero una
 * cotización necesita un `Client`, que a su vez exige departamento y ciudad.
 * Por eso la conversión recibe el `clientId` ya resuelto desde el modal del
 * frontend, donde la vendedora elige un cliente existente o crea uno nuevo.
 */
export class ConvertProspectDto {
  @ApiProperty({ description: 'Cliente existente o recién creado a vincular' })
  @IsUUID()
  clientId: string;

  @ApiProperty({ enum: ProspectConversionTarget })
  @IsEnum(ProspectConversionTarget)
  target: ProspectConversionTarget;
}
