import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { ProspectStatus } from '../../../generated/prisma';

/**
 * Todos los campos son opcionales a propósito.
 *
 * La vendedora captura al prospecto con lo que tenga en el momento: a veces
 * solo el celular, a veces solo el nombre. Exigir un campo concreto la
 * bloquearía. La única regla — "al menos uno de name/phone/email" — se valida
 * en `ProspectsService.create`, no aquí, para poder dar un mensaje único y
 * claro en vez de tres errores de campo.
 */
export class CreateProspectDto {
  @ApiPropertyOptional({ description: 'Nombre del prospecto o de la empresa' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  name?: string;

  @ApiPropertyOptional({ description: 'Celular de contacto' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  phone?: string;

  @ApiPropertyOptional({ description: 'Correo de contacto' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  email?: string;

  @ApiPropertyOptional({ description: 'Observación libre sobre el prospecto' })
  @IsOptional()
  @IsString()
  observation?: string;

  @ApiPropertyOptional({ enum: ProspectStatus, default: ProspectStatus.NUEVO })
  @IsOptional()
  @IsEnum(ProspectStatus)
  status?: ProspectStatus;

  @ApiPropertyOptional({
    description:
      'Vendedora asignada. Si se omite, se asigna el usuario autenticado.',
  })
  @IsOptional()
  @IsUUID()
  advisorId?: string;
}
