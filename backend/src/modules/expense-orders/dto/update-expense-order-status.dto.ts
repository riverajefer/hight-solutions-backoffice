import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty } from 'class-validator';
import { ExpenseOrderStatus } from '../../../generated/prisma';

export class UpdateExpenseOrderStatusDto {
  @ApiProperty({ enum: ExpenseOrderStatus, description: 'Nuevo estado de la OG' })
  @IsEnum(ExpenseOrderStatus)
  @IsNotEmpty()
  status: ExpenseOrderStatus;
}
