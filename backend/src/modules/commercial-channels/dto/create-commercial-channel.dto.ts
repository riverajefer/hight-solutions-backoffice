import { IsString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCommercialChannelDto {
  @ApiProperty({
    description: 'Nombre del canal de venta',
    example: 'Tienda Online',
  })
  @IsString()
  name: string;

  @ApiPropertyOptional({
    description: 'Descripción del canal de venta',
    example: 'Canal de ventas a través de la plataforma web',
  })
  @IsString()
  @IsOptional()
  description?: string;
}
