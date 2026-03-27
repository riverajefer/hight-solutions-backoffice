import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsInt, IsUUID, Min, ValidateNested } from 'class-validator';

class ColumnOrderItem {
  @ApiProperty({ description: 'ID de la columna' })
  @IsUUID()
  id: string;

  @ApiProperty({ description: 'Nuevo orden de visualización', minimum: 0 })
  @IsInt()
  @Min(0)
  displayOrder: number;
}

export class ReorderQuoteKanbanColumnsDto {
  @ApiProperty({ type: [ColumnOrderItem], description: 'Lista de columnas con su nuevo orden' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ColumnOrderItem)
  columns: ColumnOrderItem[];
}
