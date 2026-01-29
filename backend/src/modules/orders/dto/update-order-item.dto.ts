import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { AddOrderItemDto } from './add-order-item.dto';

export class UpdateOrderItemDto extends PartialType(AddOrderItemDto) {}
