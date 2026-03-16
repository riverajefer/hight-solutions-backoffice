import {
  IsString,
  IsBoolean,
  IsInt,
  IsOptional,
  IsArray,
  IsIn,
  IsNumber,
  ValidateNested,
  IsNotEmpty,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export const VALID_FIELD_TYPES = [
  'text',
  'number',
  'boolean',
  'select',
  'textarea',
  'date',
  'datetime',
  'supplier',
  'client',
  'material',
  'measurement',
  'quantity',
] as const;

export type FieldType = (typeof VALID_FIELD_TYPES)[number];

export class FieldValidationDto {
  @ApiPropertyOptional({ description: 'Valor mínimo (para number, quantity, measurement)' })
  @IsOptional()
  @IsNumber()
  min?: number;

  @ApiPropertyOptional({ description: 'Valor máximo (para number, quantity, measurement)' })
  @IsOptional()
  @IsNumber()
  max?: number;

  @ApiPropertyOptional({ description: 'Longitud mínima (para text, textarea)' })
  @IsOptional()
  @IsInt()
  @Min(0)
  minLength?: number;

  @ApiPropertyOptional({ description: 'Longitud máxima (para text, textarea)' })
  @IsOptional()
  @IsInt()
  @Min(0)
  maxLength?: number;

  @ApiPropertyOptional({ description: 'Patrón regex de validación' })
  @IsOptional()
  @IsString()
  pattern?: string;
}

export class FieldDefDto {
  @ApiProperty({ description: 'Clave única del campo en camelCase (ej: tipoPapel)' })
  @IsString()
  @IsNotEmpty()
  key: string;

  @ApiProperty({ description: 'Nombre visible del campo para el usuario' })
  @IsString()
  @IsNotEmpty()
  label: string;

  @ApiProperty({ description: 'Tipo del campo', enum: VALID_FIELD_TYPES })
  @IsIn(VALID_FIELD_TYPES)
  type: FieldType;

  @ApiProperty({ description: 'Etapa en que se llena el campo', enum: ['specification', 'execution'] })
  @IsIn(['specification', 'execution'])
  stage: 'specification' | 'execution';

  @ApiProperty({ description: 'Si el campo es obligatorio' })
  @IsBoolean()
  required: boolean;

  @ApiPropertyOptional({ description: 'Posición del campo dentro de su stage' })
  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;

  @ApiPropertyOptional({ description: 'Texto placeholder del campo' })
  @IsOptional()
  @IsString()
  placeholder?: string;

  @ApiPropertyOptional({ description: 'Valor por defecto del campo' })
  @IsOptional()
  defaultValue?: any;

  @ApiPropertyOptional({ description: 'Opciones disponibles (solo para type select)', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  options?: string[];

  @ApiPropertyOptional({ description: 'Reglas de validación opcionales', type: FieldValidationDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => FieldValidationDto)
  validation?: FieldValidationDto;
}

export class FieldSchemaDto {
  @ApiProperty({ description: 'Lista de campos del formulario', type: [FieldDefDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FieldDefDto)
  fields: FieldDefDto[];
}

export class UpdateFieldSchemaDto {
  @ApiProperty({ description: 'Esquema completo de campos del paso', type: FieldSchemaDto })
  @ValidateNested()
  @Type(() => FieldSchemaDto)
  fieldSchema: FieldSchemaDto;
}
