import { ApiProperty } from '@nestjs/swagger';
import { IsDateString } from 'class-validator';

/**
 * Cuerpo de los endpoints que crean una OP a partir de otro documento
 * (cotización, registro DTF). Toda OP nace con fecha y hora de entrega, y
 * ninguno de esos documentos la trae, así que la pide quien convierte.
 */
export class ConvertToOrderDto {
  @ApiProperty({
    description: 'Fecha y hora estimada de entrega de la OP (ISO 8601)',
    example: '2025-02-15T15:00:00.000Z',
  })
  @IsDateString({}, { message: 'La fecha y hora de entrega es obligatoria y debe ser válida' })
  deliveryDate: string;
}
