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

// ---------------------------------------------------------------------------
// Tablero Comercial
// ---------------------------------------------------------------------------

export interface CommercialQueryParams {
  dateFrom?: string;
  dateTo?: string;
  advisorId?: string;
}

export interface CommercialKpis {
  quotesCount: number;
  quotesAmount: number;
  /** Cotizaciones que salieron del borrador: la base de la conversión. */
  quotesSent: number;
  /** Aceptadas o convertidas en OP. */
  quotesWon: number;
  conversionRate: number;
  salesAmount: number;
  salesOrders: number;
  averageTicket: number;
  /** Cartera a hoy: no depende del período. */
  portfolioTotal: number;
  portfolioOrders: number;
  newClients: number;
}

export interface CommercialSalesByStatus {
  key: string;
  label: string;
  orders: number;
  amount: number;
  collected: number;
}

export interface CommercialAgingBucket {
  key: '0-30' | '31-60' | '61-90' | '90+';
  label: string;
  orders: number;
  balance: number;
}

export interface CommercialFunnelStage {
  status: string;
  count: number;
  amount: number;
}

export interface CommercialGoal {
  month: number;
  year: number;
  hasGoal: boolean;
  target: number;
  achieved: number;
  progress: number;
  remaining: number;
}

export interface CommercialAdvisorRow {
  advisorId: string;
  advisorName: string;
  salesAmount: number;
  salesOrders: number;
  averageTicket: number;
  quotes: number;
  quotesWon: number;
  conversionRate: number;
  newClients: number;
  portfolio: number;
  portfolioOver90: number;
  goalTarget: number | null;
  goalProgress: number | null;
}

export interface CommercialTopDebtor {
  clientId: string;
  clientName: string;
  balance: number;
  orders: number;
  oldestOrderDate: string;
}

export interface CommercialTrendPoint {
  /** `YYYY-MM` */
  month: string;
  /** Valor de las cotizaciones enviadas (sin borradores). */
  quoted: number;
  /** Venta del mes: misma regla que el KPI de ventas. */
  sold: number;
  /** Pagos que entraron en el mes (sin anulados, crédito ni saldo a favor). */
  collected: number;
  /** Suma de metas del mes; `null` si no hay meta cargada. */
  goal: number | null;
  /** El mes en curso: sus cifras siguen sumando. */
  inProgress: boolean;
  /** Venta a clientes cuya primera OP es de este mes. Con `recurringClientSales` suma `sold`. */
  newClientSales: number;
  /** Venta a clientes que ya habían comprado en un mes anterior. */
  recurringClientSales: number;
  newClients: number;
  recurringClients: number;
}

export interface CommercialDashboardResponse {
  period: { dateFrom: string; dateTo: string };
  scopedToOwn: boolean;
  advisorId: string | null;
  advisors: Array<{ id: string; name: string }>;
  kpis: CommercialKpis;
  salesByStatus: CommercialSalesByStatus[];
  portfolioAging: CommercialAgingBucket[];
  quoteFunnel: {
    stages: CommercialFunnelStage[];
    openAmount: number;
    openCount: number;
  };
  goal: CommercialGoal;
  advisorRanking: CommercialAdvisorRow[];
  topDebtors: CommercialTopDebtor[];
  /** Últimos 12 meses; no sigue el periodo elegido. */
  monthlyTrend: CommercialTrendPoint[];
}
