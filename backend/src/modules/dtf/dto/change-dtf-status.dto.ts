import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { DtfStatus } from '../../../generated/prisma';

export class ChangeDtfStatusDto {
  @ApiProperty({ enum: DtfStatus, description: 'Nuevo estado del registro DTF' })
  @IsEnum(DtfStatus)
  status: DtfStatus;
}
