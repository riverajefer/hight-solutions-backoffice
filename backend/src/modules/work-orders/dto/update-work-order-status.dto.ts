import { IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { WorkOrderStatus } from '../../../generated/prisma';

export class UpdateWorkOrderStatusDto {
  @ApiProperty({
    description: 'Nuevo estado de la OT',
    enum: WorkOrderStatus,
  })
  @IsEnum(WorkOrderStatus)
  status: WorkOrderStatus;
}
