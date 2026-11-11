import { ApiProperty } from '@nestjs/swagger';
import { IsUUID, ValidateIf } from 'class-validator';

export class LinkPurchaseLineDto {
  @ApiProperty({ description: 'Línea de OG con que se compró el rollo; null la desvincula', nullable: true })
  @ValidateIf((_, v) => v !== null)
  @IsUUID()
  expenseOrderItemId: string | null;
}
