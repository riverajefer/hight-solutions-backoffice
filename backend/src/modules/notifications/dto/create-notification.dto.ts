import { IsString, IsNotEmpty, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { NotificationType } from '../../../generated/prisma';

export class CreateNotificationDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({ description: 'ID del usuario destinatario' })
  userId: string;

  @IsEnum(NotificationType)
  @ApiProperty({
    description: 'Tipo de notificación',
    enum: NotificationType,
  })
  type: NotificationType;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({ description: 'Título de la notificación' })
  title: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({ description: 'Mensaje de la notificación' })
  message: string;

  @IsString()
  @IsOptional()
  @ApiProperty({
    description: 'ID del recurso relacionado',
    required: false,
  })
  relatedId?: string;

  @IsString()
  @IsOptional()
  @ApiProperty({
    description: 'Tipo de recurso relacionado',
    required: false,
  })
  relatedType?: string;
}
