export interface FinancialSummary {
  totalVentas: number;
  totalVentasPrev: number;
  totalGastos: number;
  totalGastosPrev: number;
  utilidad: number;
  utilidadPrev: number;
  cuentasPorPagar: number;
  cuentasPorCobrar: number;
}

export interface MonthlyDataPoint {
  month: string;
  ventas: number;
  gastos: number;
  utilidad: number;
}

export interface FinancialIndicators {
  totalClients: number;
  totalProducts: number;
  totalSuppliers: number;
  totalOP: number;
  totalOT: number;
  totalOG: number;
}

export interface RecentOrder {
  id: string;
  orderNumber: string;
  clientName: string;
  total: number;
  status: string;
  createdAt: string;
}

export interface PendingOrder {
  id: string;
  orderNumber: string;
  clientName: string;
  balance: number;
  status: string;
}

export interface TopClient {
  clientId: string;
  clientName: string;
  totalCompras: number;
  orderCount: number;
}

export interface FinancialDashboardResponse {
  summary: FinancialSummary;
  monthlyData: MonthlyDataPoint[];
  indicators: FinancialIndicators;
  recentOrders: RecentOrder[];
  pendingOrders: PendingOrder[];
  topClients: TopClient[];
}

export interface FinancialQueryParams {
  dateFrom?: string;
  dateTo?: string;
}
