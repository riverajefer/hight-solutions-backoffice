import { IsEnum, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum EntityType {
  QUOTE = 'quote',
  ORDER = 'order',
  WORK_ORDER = 'work-order',
  EXPENSE_ORDER = 'expense-order',
}

export class GetOrderTreeParamsDto {
  @ApiProperty({
    description: 'Tipo de entidad',
    enum: EntityType,
    example: EntityType.ORDER,
  })
  @IsEnum(EntityType)
  entityType: EntityType;

  @ApiProperty({
    description: 'ID de la entidad',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID()
  entityId: string;
}
