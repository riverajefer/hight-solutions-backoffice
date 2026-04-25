import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { Prisma } from '../../generated/prisma';

@Injectable()
export class DashboardRepository {
  constructor(private readonly prisma: PrismaService) {}

  async getTotalVentas(gte: Date, lte: Date): Promise<number> {
    const result = await this.prisma.order.aggregate({
      _sum: { total: true },
      where: {
        status: { not: 'ANULADO' },
        createdAt: { gte, lte },
      },
    });
    return Number(result._sum.total ?? 0);
  }

  async getTotalGastos(gte: Date, lte: Date): Promise<number> {
    const result = await this.prisma.expenseOrderItem.aggregate({
      _sum: { total: true },
      where: {
        expenseOrder: {
          status: { in: ['AUTHORIZED', 'PAID'] },
          createdAt: { gte, lte },
        },
      },
    });
    return Number(result._sum.total ?? 0);
  }

  async getCuentasPorPagar(): Promise<number> {
    const result = await this.prisma.accountPayable.aggregate({
      _sum: { balance: true },
      where: {
        status: { in: ['PENDING', 'PARTIAL', 'OVERDUE'] },
      },
    });
    return Number(result._sum.balance ?? 0);
  }

  async getMonthlyData(): Promise<Array<{ month: string; ventas: number; gastos: number }>> {
    const ventasRaw = await this.prisma.$queryRaw<Array<{ month: string; total: string }>>`
      SELECT TO_CHAR(DATE_TRUNC('month', created_at), 'YYYY-MM') AS month,
             COALESCE(SUM(total), 0)::text AS total
      FROM "orders"
      WHERE status != 'ANULADO'
        AND created_at >= NOW() - INTERVAL '12 months'
      GROUP BY DATE_TRUNC('month', created_at)
      ORDER BY DATE_TRUNC('month', created_at)
    `;

    const gastosRaw = await this.prisma.$queryRaw<Array<{ month: string; total: string }>>`
      SELECT TO_CHAR(DATE_TRUNC('month', eo.created_at), 'YYYY-MM') AS month,
             COALESCE(SUM(eoi.total), 0)::text AS total
      FROM "expense_order_items" eoi
      JOIN "expense_orders" eo ON eoi.expense_order_id = eo.id
      WHERE eo.status IN ('AUTHORIZED', 'PAID')
        AND eo.created_at >= NOW() - INTERVAL '12 months'
      GROUP BY DATE_TRUNC('month', eo.created_at)
      ORDER BY DATE_TRUNC('month', eo.created_at)
    `;

    const ventasMap = new Map(ventasRaw.map((r) => [r.month, Number(r.total)]));
    const gastosMap = new Map(gastosRaw.map((r) => [r.month, Number(r.total)]));

    // Build last 12 months list
    const months: string[] = [];
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      months.push(key);
    }

    return months.map((month) => ({
      month,
      ventas: ventasMap.get(month) ?? 0,
      gastos: gastosMap.get(month) ?? 0,
    }));
  }

  async getIndicators() {
    const [clients, products, suppliers, orders, workOrders, expenseOrders] =
      await Promise.all([
        this.prisma.client.count(),
        this.prisma.product.count({ where: { isActive: true } }),
        this.prisma.supplier.count(),
        this.prisma.order.count({ where: { status: { not: 'ANULADO' } } }),
        this.prisma.workOrder.count({ where: { status: { not: 'CANCELLED' } } }),
        this.prisma.expenseOrder.count({ where: { status: { not: 'DRAFT' } } }),
      ]);

    return { clients, products, suppliers, orders, workOrders, expenseOrders };
  }

  async getRecentOrders(limit = 10) {
    const orders = await this.prisma.order.findMany({
      take: limit,
      orderBy: { createdAt: 'desc' },
      where: { status: { not: 'ANULADO' } },
      select: {
        id: true,
        orderNumber: true,
        total: true,
        status: true,
        createdAt: true,
        client: { select: { name: true } },
      },
    });

    return orders.map((o) => ({
      id: o.id,
      orderNumber: o.orderNumber,
      clientName: o.client.name,
      total: Number(o.total),
      status: o.status,
      createdAt: o.createdAt.toISOString(),
    }));
  }

  async getPendingOrders(limit = 10) {
    const orders = await this.prisma.order.findMany({
      take: limit,
      orderBy: { createdAt: 'asc' },
      where: {
        status: { in: ['CONFIRMED', 'IN_PRODUCTION', 'READY', 'DELIVERED', 'WARRANTY'] },
        balance: { gt: 0 },
      },
      select: {
        id: true,
        orderNumber: true,
        balance: true,
        status: true,
        client: { select: { name: true } },
      },
    });

    return orders.map((o) => ({
      id: o.id,
      orderNumber: o.orderNumber,
      clientName: o.client.name,
      balance: Number(o.balance),
      status: o.status,
    }));
  }

  async getTopClients(limit = 5, gte: Date, lte: Date) {
    const grouped = await this.prisma.order.groupBy({
      by: ['clientId'],
      _sum: { total: true },
      _count: { id: true },
      where: {
        status: { not: 'ANULADO' },
        createdAt: { gte, lte },
      },
      orderBy: { _sum: { total: 'desc' } },
      take: limit,
    });

    const clientIds = grouped.map((g) => g.clientId);
    const clients = await this.prisma.client.findMany({
      where: { id: { in: clientIds } },
      select: { id: true, name: true },
    });

    const clientMap = new Map(clients.map((c) => [c.id, c.name]));

    return grouped.map((g) => ({
      clientId: g.clientId,
      clientName: clientMap.get(g.clientId) ?? 'Desconocido',
      totalCompras: Number(g._sum.total ?? 0),
      orderCount: g._count.id,
    }));
  }
}
