import { IsOptional, IsString, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateExpenseOrderAuthRequestDto {
  @ApiProperty({ description: 'ID de la orden de gasto' })
  @IsUUID()
  expenseOrderId: string;

  @ApiPropertyOptional({ description: 'Razón del cambio de estado' })
  @IsOptional()
  @IsString()
  reason?: string;
}
