import {
  IsString,
  IsOptional,
  IsBoolean,
  IsInt,
  IsUUID,
  IsEnum,
  IsObject,
  ValidateNested,
  IsArray,
  Min,
  IsNotEmpty,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ComponentPhase } from '../../../generated/prisma';

export class TemplateStepDto {
  @ApiProperty({ description: 'ID del StepDefinition' })
  @IsUUID()
  stepDefinitionId: string;

  @ApiProperty({ description: 'Orden del paso dentro del componente' })
  @IsInt()
  @Min(1)
  order: number;

  @ApiProperty({ description: 'Si el paso es requerido', default: true })
  @IsBoolean()
  isRequired: boolean;

  @ApiPropertyOptional({ description: 'Overrides del fieldSchema base' })
  @IsOptional()
  @IsObject()
  fieldOverrides?: Record<string, any>;
}

export class TemplateComponentDto {
  @ApiProperty({ description: 'Nombre del componente' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: 'Orden del componente dentro de la plantilla' })
  @IsInt()
  @Min(1)
  order: number;

  @ApiProperty({ description: 'Fase del componente', enum: ComponentPhase })
  @IsEnum(ComponentPhase)
  phase: ComponentPhase;

  @ApiProperty({ description: 'Si el componente es requerido', default: true })
  @IsBoolean()
  isRequired: boolean;

  @ApiProperty({ type: [TemplateStepDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TemplateStepDto)
  steps: TemplateStepDto[];
}

export class CreateProductTemplateDto {
  @ApiProperty({ description: 'Nombre de la plantilla' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: 'Categoría del producto (ej: cuadernos, papeleria_impresa)' })
  @IsString()
  @IsNotEmpty()
  category: string;

  @ApiPropertyOptional({ description: 'Descripción de la plantilla' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Si la plantilla está activa', default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiProperty({ type: [TemplateComponentDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TemplateComponentDto)
  components: TemplateComponentDto[];
}
