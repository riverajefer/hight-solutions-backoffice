import { IsString, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateCommercialChannelDto {
  @ApiPropertyOptional({
    description: 'Nombre del canal de venta',
    example: 'Tienda Online',
  })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({
    description: 'Descripción del canal de venta',
    example: 'Canal de ventas a través de la plataforma web',
  })
  @IsString()
  @IsOptional()
  description?: string;
}
