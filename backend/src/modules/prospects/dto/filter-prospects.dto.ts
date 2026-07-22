import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ContactMedium, ProspectStatus } from '../../../generated/prisma';

export class FilterProspectsDto {
  @ApiPropertyOptional({ enum: ProspectStatus })
  @IsOptional()
  @IsEnum(ProspectStatus)
  status?: ProspectStatus;

  @ApiPropertyOptional({ description: 'Filtrar por vendedora asignada' })
  @IsOptional()
  @IsUUID()
  advisorId?: string;

  @ApiPropertyOptional({
    enum: ContactMedium,
    description: 'Prospectos que tengan al menos un contacto por este medio',
  })
  @IsOptional()
  @IsEnum(ContactMedium)
  medium?: ContactMedium;

  @ApiPropertyOptional({ description: 'Fecha de creación desde' })
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiPropertyOptional({ description: 'Fecha de creación hasta' })
  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @ApiPropertyOptional({
    description:
      'Solo prospectos sin contactar hace N días o más (incluye los que nunca han sido contactados)',
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  sinContactoDias?: number;

  @ApiPropertyOptional({ description: 'Búsqueda por nombre, celular o correo' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  page?: number;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  limit?: number;
}
