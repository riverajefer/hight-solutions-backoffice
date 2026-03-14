import { PartialType } from '@nestjs/swagger';
import { CreateWorkOrderTimeEntryDto } from './create-work-order-time-entry.dto';

export class UpdateWorkOrderTimeEntryDto extends PartialType(CreateWorkOrderTimeEntryDto) {}
