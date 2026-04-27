import { Injectable } from '@nestjs/common';
import { DashboardRepository } from './dashboard.repository';
import { FinancialQueryDto } from './dto/financial-query.dto';

@Injectable()
export class DashboardService {
  constructor(private readonly repository: DashboardRepository) {}

  async getFinancialDashboard(query: FinancialQueryDto) {
    const { gte, lte, prevGte, prevLte } = this.resolveDateRange(query);

    const [
      totalVentas,
      totalVentasPrev,
      totalGastos,
      totalGastosPrev,
      cuentasPorPagar,
      monthlyData,
      indicators,
      recentOrders,
      pendingOrders,
      topClients,
    ] = await Promise.all([
      this.repository.getTotalVentas(gte, lte),
      this.repository.getTotalVentas(prevGte, prevLte),
      this.repository.getTotalGastos(gte, lte),
      this.repository.getTotalGastos(prevGte, prevLte),
      this.repository.getCuentasPorPagar(),
      this.repository.getMonthlyData(),
      this.repository.getIndicators(),
      this.repository.getRecentOrders(10),
      this.repository.getPendingOrders(10),
      this.repository.getTopClients(5, gte, lte),
    ]);

    const utilidad = totalVentas - totalGastos;
    const utilidadPrev = totalVentasPrev - totalGastosPrev;

    return {
      summary: {
        totalVentas,
        totalVentasPrev,
        totalGastos,
        totalGastosPrev,
        utilidad,
        utilidadPrev,
        cuentasPorPagar,
      },
      monthlyData: monthlyData.map((m) => ({
        ...m,
        utilidad: m.ventas - m.gastos,
      })),
      indicators: {
        totalClients: indicators.clients,
        totalProducts: indicators.products,
        totalSuppliers: indicators.suppliers,
        totalOP: indicators.orders,
        totalOT: indicators.workOrders,
        totalOG: indicators.expenseOrders,
      },
      recentOrders,
      pendingOrders,
      topClients,
    };
  }

  private resolveDateRange(query: FinancialQueryDto) {
    const now = new Date();

    let lte: Date;
    let gte: Date;

    if (query.dateFrom && query.dateTo) {
      gte = new Date(query.dateFrom);
      lte = new Date(query.dateTo);
      lte.setHours(23, 59, 59, 999);
    } else {
      // Default: current month
      gte = new Date(now.getFullYear(), now.getMonth(), 1);
      lte = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    }

    const periodMs = lte.getTime() - gte.getTime();
    const prevLte = new Date(gte.getTime() - 1);
    const prevGte = new Date(prevLte.getTime() - periodMs);

    return { gte, lte, prevGte, prevLte };
  }
}
