import { IsUUID, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateProductionOrderDto {
  @ApiProperty({ description: 'ID de la plantilla de producto a usar' })
  @IsUUID()
  templateId: string;

  @ApiProperty({ description: 'ID de la WorkOrder vinculada (relación 1:1)' })
  @IsUUID()
  workOrderId: string;

  @ApiPropertyOptional({ description: 'Notas adicionales para la OT de producción' })
  @IsOptional()
  @IsString()
  notes?: string;
}
