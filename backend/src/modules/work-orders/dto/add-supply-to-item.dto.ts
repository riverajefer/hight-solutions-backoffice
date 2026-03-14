import { IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AddSupplyToItemDto {
  @ApiProperty({ description: 'ID del insumo' })
  @IsUUID()
  supplyId: string;

  @ApiPropertyOptional({ description: 'Cantidad estimada del insumo' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  quantity?: number;

  @ApiPropertyOptional({ description: 'Notas sobre el uso del insumo' })
  @IsOptional()
  @IsString()
  notes?: string;
}
