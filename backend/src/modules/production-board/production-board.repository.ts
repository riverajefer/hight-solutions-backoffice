import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { Prisma, WorkOrderStatus } from '../../generated/prisma';
import { BOARD_OPEN_STATUSES, BOARD_STATUSES } from './production-board.constants';

/**
 * `select` explícito: el tablero trae cientos de órdenes en una sola respuesta,
 * así que solo viaja lo que la tarjeta muestra.
 */
export const boardOrderSelect = {
  id: true,
  orderNumber: true,
  status: true,
  orderDate: true,
  deliveryDate: true,
  total: true,
  balance: true,
  client: { select: { id: true, name: true } },
  createdBy: { select: { id: true, firstName: true, lastName: true } },
  items: {
    select: {
      id: true,
      description: true,
      quantity: true,
      annulledQuantity: true,
      productionAreas: {
        select: { productionArea: { select: { id: true, name: true } } },
      },
    },
    orderBy: { sortOrder: 'asc' },
  },
  workOrders: {
    where: { status: { not: WorkOrderStatus.CANCELLED } },
    select: { id: true, workOrderNumber: true, status: true },
  },
  _count: { select: { dtfRecords: true } },
} satisfies Prisma.OrderSelect;

export type BoardOrder = Prisma.OrderGetPayload<{ select: typeof boardOrderSelect }>;

@Injectable()
export class ProductionBoardRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findBoardOrders(cutoffDate: Date): Promise<BoardOrder[]> {
    return this.prisma.order.findMany({
      where: {
        orderDate: { gte: cutoffDate },
        status: { in: BOARD_STATUSES },
      },
      select: boardOrderSelect,
      orderBy: { orderDate: 'desc' },
    });
  }

  /**
   * Órdenes abiertas anteriores a la ventana del tablero. Los borradores no
   * cuentan: nunca fueron trabajo en firme.
   */
  async countStaleOpenOrders(cutoffDate: Date): Promise<number> {
    return this.prisma.order.count({
      where: {
        orderDate: { lt: cutoffDate },
        status: { in: BOARD_OPEN_STATUSES },
      },
    });
  }
}
