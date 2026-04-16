import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMinSize,
  IsArray,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { DenominationCountItemDto } from './denomination-count-item.dto';

export class CloseCashSessionDto {
  @ApiProperty({
    description: 'Conteo de denominaciones al cierre (conteo ciego)',
    type: [DenominationCountItemDto],
  })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => DenominationCountItemDto)
  denominations: DenominationCountItemDto[];

  @ApiPropertyOptional({ description: 'Observaciones del cierre / motivo de descuadre' })
  @IsOptional()
  @IsString()
  notes?: string;
}
