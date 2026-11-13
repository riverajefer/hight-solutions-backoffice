import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class AssignPendingDto {
  @ApiProperty({ description: 'Insumo cuyos consumos pendientes se asignan a rollos' })
  @IsUUID()
  supplyId: string;
}
