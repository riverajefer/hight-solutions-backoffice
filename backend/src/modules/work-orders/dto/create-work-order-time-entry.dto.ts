import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateIf,
} from 'class-validator';
import { WorkOrderTimeEntryType } from '../../../generated/prisma';

export class CreateWorkOrderTimeEntryDto {
  @ApiProperty({ enum: WorkOrderTimeEntryType })
  @IsEnum(WorkOrderTimeEntryType)
  entryType: WorkOrderTimeEntryType;

  @ApiPropertyOptional({ description: 'ID del item de OT (opcional para registro a nivel OT)' })
  @IsOptional()
  @IsUUID()
  workOrderItemId?: string;

  @ApiProperty({ description: 'Fecha de trabajo (YYYY-MM-DD o ISO)' })
  @IsDateString()
  workedDate: string;

  @ApiPropertyOptional({ description: 'Horas trabajadas cuando entryType = HOURS', example: 1.5 })
  @ValidateIf((o) => o.entryType === WorkOrderTimeEntryType.HOURS)
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  hoursWorked?: number;

  @ApiPropertyOptional({ description: 'Fecha/hora de inicio cuando entryType = RANGE' })
  @ValidateIf((o) => o.entryType === WorkOrderTimeEntryType.RANGE)
  @IsDateString()
  startAt?: string;

  @ApiPropertyOptional({ description: 'Fecha/hora fin cuando entryType = RANGE' })
  @ValidateIf((o) => o.entryType === WorkOrderTimeEntryType.RANGE)
  @IsDateString()
  endAt?: string;

  @ApiPropertyOptional({ description: 'Nota del registro' })
  @IsOptional()
  @IsString()
  notes?: string;
}
