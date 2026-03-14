import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsIn } from 'class-validator';
import { ENTITY_TYPES } from '../constants/file-config.constants';

export class UploadFileDto {
  @ApiPropertyOptional({ description: 'Tipo de entidad relacionada' })
  @IsOptional()
  @IsString()
  @IsIn(Object.values(ENTITY_TYPES))
  entityType?: string;

  @ApiPropertyOptional({ description: 'ID de la entidad relacionada' })
  @IsOptional()
  @IsString()
  entityId?: string;
}
