import { PartialType } from '@nestjs/swagger';
import { AddQuoteItemDto } from './add-quote-item.dto';

export class UpdateQuoteItemDto extends PartialType(AddQuoteItemDto) {}
