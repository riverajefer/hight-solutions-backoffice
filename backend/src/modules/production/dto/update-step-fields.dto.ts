import { IsObject } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateStepSpecificationDto {
  @ApiProperty({ description: 'Campos de especificación a actualizar (key-value)' })
  @IsObject()
  data: Record<string, any>;
}

export class UpdateStepExecutionDto {
  @ApiProperty({ description: 'Campos de ejecución a actualizar (key-value)' })
  @IsObject()
  data: Record<string, any>;
}
