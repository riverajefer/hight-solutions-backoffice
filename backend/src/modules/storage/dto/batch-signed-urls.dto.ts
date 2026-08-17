import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  IsArray,
  IsInt,
  IsOptional,
  IsUUID,
  Max,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

/** Tope de expiración de una URL prefirmada con SigV4: 7 días en segundos. */
export const MAX_SIGNED_URL_EXPIRATION = 604800;

/** Tope de ids por lote, para acotar el tamaño del cuerpo y de la respuesta. */
export const MAX_BATCH_SIGNED_URL_IDS = 2000;

/**
 * Pide en un solo request las URLs prefirmadas de varios archivos.
 *
 * Existe para la exportación a Excel de abonos, donde una hoja puede referenciar
 * cientos de comprobantes: pedirlos uno por uno sería un request HTTP por pago.
 * Firmar es HMAC local (sin llamada a S3), así que el lote es barato.
 */
export class BatchSignedUrlsDto {
  @ApiProperty({
    description: 'IDs de los archivos a firmar',
    type: [String],
    example: ['3f6c1b6e-6a4a-4a3d-9a2f-1b2c3d4e5f60'],
  })
  @IsArray()
  @ArrayMaxSize(MAX_BATCH_SIGNED_URL_IDS)
  @IsUUID('4', { each: true })
  ids: string[];

  @ApiPropertyOptional({
    description:
      'Expiración de las URLs en segundos (default: el configurado, 3600). ' +
      `Máximo ${MAX_SIGNED_URL_EXPIRATION} (7 días, tope de SigV4).`,
    minimum: 1,
    maximum: MAX_SIGNED_URL_EXPIRATION,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_SIGNED_URL_EXPIRATION)
  expiresIn?: number;
}
