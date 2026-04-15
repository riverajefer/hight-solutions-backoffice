import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMinSize,
  IsArray,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { DenominationCountItemDto } from './denomination-count-item.dto';

export class OpenCashSessionDto {
  @ApiProperty({ description: 'ID de la caja registradora a abrir' })
  @IsString()
  @IsNotEmpty()
  cashRegisterId: string;

  @ApiProperty({
    description: 'Conteo de denominaciones del fondo de apertura',
    type: [DenominationCountItemDto],
  })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => DenominationCountItemDto)
  denominations: DenominationCountItemDto[];

  @ApiPropertyOptional({ description: 'Observaciones de apertura' })
  @IsOptional()
  @IsString()
  notes?: string;
}
