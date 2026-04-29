import { IsString, IsUUID, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateApAuthRequestDto {
  @ApiProperty({ description: 'ID de la Cuenta por Pagar a autorizar' })
  @IsUUID()
  accountPayableId: string;

  @ApiPropertyOptional({ description: 'Razón o justificación de la solicitud' })
  @IsOptional()
  @IsString()
  reason?: string;
}
