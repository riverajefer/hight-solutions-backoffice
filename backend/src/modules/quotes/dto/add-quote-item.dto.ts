import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsUUID, IsOptional, IsString, IsNumber, IsPositive, Min } from 'class-validator';

export class AddQuoteItemDto {
  @ApiPropertyOptional({ example: 'uuid-service' })
  @IsOptional()
  @IsUUID()
  serviceId?: string;

  @ApiProperty({ example: 'Nuevo item' })
  @IsString()
  description: string;

  @ApiProperty({ example: 1 })
  @IsNumber()
  @IsPositive()
  quantity: number;

  @ApiProperty({ example: 1000 })
  @IsNumber()
  @Min(0)
  unitPrice: number;

  @ApiPropertyOptional({ example: { detail: 'value' } })
  @IsOptional()
  specifications?: Record<string, any>;
}
