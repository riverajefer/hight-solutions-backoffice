import { PartialType } from '@nestjs/swagger';
import { CreateDtfRecordDto } from './create-dtf-record.dto';

export class UpdateDtfRecordDto extends PartialType(CreateDtfRecordDto) {}
