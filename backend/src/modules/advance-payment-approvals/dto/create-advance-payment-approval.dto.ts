import { IsOptional, IsString, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateAdvancePaymentApprovalDto {
  @ApiProperty({ description: 'ID de la orden de pedido' })
  @IsUUID()
  orderId: string;

  @ApiPropertyOptional({ description: 'Razón de la solicitud' })
  @IsOptional()
  @IsString()
  reason?: string;
}
