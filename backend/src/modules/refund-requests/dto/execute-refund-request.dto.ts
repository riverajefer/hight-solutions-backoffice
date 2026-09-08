import { IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class ExecuteRefundRequestDto {
  @ApiPropertyOptional({
    description:
      'Id del archivo de comprobante de la transferencia que Caja acaba de ' +
      'hacer. Solo aplica cuando el método es TRANSFER: una devolución en ' +
      'efectivo queda soportada por el recibo de caja que genera la ejecución.',
  })
  @IsOptional()
  @IsString()
  receiptFileId?: string;
}
