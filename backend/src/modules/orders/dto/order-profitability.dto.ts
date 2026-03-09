import { ApiProperty } from '@nestjs/swagger';

export class ExpenseOrderSummaryDto {
  @ApiProperty() id: string;
  @ApiProperty() ogNumber: string;
  @ApiProperty() status: string;
  @ApiProperty({ nullable: true, type: String }) workOrderNumber: string | null;
  @ApiProperty({ type: Number }) itemsTotal: number;
}

export class OrderProfitabilityDto {
  @ApiProperty() orderId: string;
  @ApiProperty() orderNumber: string;
  @ApiProperty({ type: Number }) orderTotal: number;
  @ApiProperty({ type: [ExpenseOrderSummaryDto] }) expenseOrders: ExpenseOrderSummaryDto[];
  @ApiProperty({ type: Number }) totalExpenses: number;
  @ApiProperty({ type: Number }) utility: number;
  @ApiProperty({ type: Number }) utilityPercentage: number;
}

export class OrderProfitabilityListItemDto {
  @ApiProperty() orderId: string;
  @ApiProperty() orderNumber: string;
  @ApiProperty() clientName: string;
  @ApiProperty({ type: Number }) orderTotal: number;
  @ApiProperty({ type: Number }) totalExpenses: number;
  @ApiProperty({ type: Number }) utility: number;
  @ApiProperty({ type: Number }) utilityPercentage: number;
  @ApiProperty() status: string;
  @ApiProperty() orderDate: string;
}

export class PaginatedProfitabilityDto {
  @ApiProperty({ type: [OrderProfitabilityListItemDto] }) data: OrderProfitabilityListItemDto[];
  @ApiProperty({ type: Number }) total: number;
  @ApiProperty({ type: Number }) page: number;
  @ApiProperty({ type: Number }) limit: number;
}
