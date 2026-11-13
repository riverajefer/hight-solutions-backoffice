import { ApiProperty } from '@nestjs/swagger';

export class ExpenseOrderSummaryDto {
  @ApiProperty() id: string;
  @ApiProperty() ogNumber: string;
  @ApiProperty() status: string;
  @ApiProperty({ nullable: true, type: String }) workOrderNumber: string | null;
  @ApiProperty({ type: Number }) itemsTotal: number;
  @ApiProperty({ type: Number, description: 'Líneas que compraron un rollo: no se suman (su costo entra por el consumo)' })
  excludedTotal: number;
}

export class OrderMaterialCostDto {
  @ApiProperty() supplyId: string;
  @ApiProperty() supplyName: string;
  @ApiProperty() unit: string;
  @ApiProperty({ type: Number }) quantity: number;
  @ApiProperty({ type: Number }) cost: number;
  @ApiProperty({ type: Number, description: 'Cantidad sin rollo asignado (todavía sin costo)' }) pendingQuantity: number;
}

export class OrderProfitabilityDto {
  @ApiProperty() orderId: string;
  @ApiProperty() orderNumber: string;
  @ApiProperty({ type: Number, description: 'Total de la OP (con IVA y retenciones), solo referencia' }) orderTotal: number;
  @ApiProperty({ type: Number, description: 'Venta sin IVA: base de la utilidad' }) revenue: number;
  @ApiProperty({ type: Number }) expenseOrdersTotal: number;
  @ApiProperty({ type: Number }) materialCost: number;
  @ApiProperty({ description: 'Hay material vendido sin rollo: su costo aún no cuenta' }) hasPendingMaterial: boolean;
  @ApiProperty({ type: Number }) totalExpenses: number;
  @ApiProperty({ type: [ExpenseOrderSummaryDto] }) expenseOrders: ExpenseOrderSummaryDto[];
  @ApiProperty({ type: [OrderMaterialCostDto] }) materials: OrderMaterialCostDto[];
  @ApiProperty({ type: Number }) utility: number;
  @ApiProperty({ type: Number }) utilityPercentage: number;
}

export class OrderProfitabilityListItemDto {
  @ApiProperty() orderId: string;
  @ApiProperty() orderNumber: string;
  @ApiProperty() clientName: string;
  @ApiProperty({ type: Number, description: 'Total de la OP (con IVA y retenciones), solo referencia' }) orderTotal: number;
  @ApiProperty({ type: Number, description: 'Venta sin IVA: base de la utilidad' }) revenue: number;
  @ApiProperty({ type: Number }) expenseOrdersTotal: number;
  @ApiProperty({ type: Number }) materialCost: number;
  @ApiProperty({ description: 'Hay material vendido sin rollo: su costo aún no cuenta' }) hasPendingMaterial: boolean;
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
