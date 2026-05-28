import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class CreateApPaymentReversalRequestDto {
  @ApiProperty({ description: 'ID de la solicitud de pago autorizada (AccountPayablePaymentAuthRequest)' })
  @IsUUID()
  paymentAuthRequestId: string;

  @ApiProperty({ description: 'Motivo de la reversión del pago' })
  @IsString()
  @IsNotEmpty()
  reason: string;
}
