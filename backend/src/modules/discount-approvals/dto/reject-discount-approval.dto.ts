import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RejectDiscountApprovalDto {
  @ApiProperty({ description: 'Motivo del rechazo', example: 'Descuento no autorizado por política de precios' })
  @IsNotEmpty()
  @IsString()
  reviewNotes: string;
}
