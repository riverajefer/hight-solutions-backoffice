import { Injectable } from '@nestjs/common';
import { OrderStatus, WorkOrderStatus } from '../../generated/prisma';
import { ProductionBoardQueryDto } from './dto';
import { BOARD_DEFAULT_DAYS } from './production-board.constants';
import { BoardOrder, ProductionBoardRepository } from './production-board.repository';

export interface ProductionBoardArea {
  id: string;
  name: string;
}

export interface ProductionBoardCard {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  orderDate: string;
  deliveryDate: string | null;
  total: number;
  balance: number;
  clientName: string;
  advisor: { id: string; name: string };
  /** La OP nació de un DTF: venta rápida de mostrador. */
  isCounterSale: boolean;
  workOrder: { id: string; number: string; status: WorkOrderStatus } | null;
  /** Áreas de producción únicas de la OP, en el orden de sus ítems. */
  areas: ProductionBoardArea[];
  items: Array<{
    id: string;
    description: string;
    quantity: number;
    areas: string[];
  }>;
}

export interface ProductionBoardResponse {
  generatedAt: string;
  cutoffDate: string;
  staleOpenCount: number;
  cards: ProductionBoardCard[];
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

@Injectable()
export class ProductionBoardService {
  constructor(private readonly repository: ProductionBoardRepository) {}

  async getBoard(query: ProductionBoardQueryDto): Promise<ProductionBoardResponse> {
    const now = new Date();
    const days = query.days ?? BOARD_DEFAULT_DAYS;
    const cutoffDate = new Date(now.getTime() - days * MS_PER_DAY);

    const [orders, staleOpenCount] = await Promise.all([
      this.repository.findBoardOrders(cutoffDate),
      this.repository.countStaleOpenOrders(cutoffDate),
    ]);

    return {
      generatedAt: now.toISOString(),
      cutoffDate: cutoffDate.toISOString(),
      staleOpenCount,
      cards: orders.map((order) => this.toCard(order)),
    };
  }

  private toCard(order: BoardOrder): ProductionBoardCard {
    const areasById = new Map<string, ProductionBoardArea>();
    const items: ProductionBoardCard['items'] = [];

    for (const item of order.items) {
      // Un ítem anulado por completo ya no es trabajo por hacer.
      const quantity = Number(item.quantity) - Number(item.annulledQuantity);
      if (quantity <= 0) continue;

      const itemAreas = item.productionAreas.map((pa) => pa.productionArea);
      itemAreas.forEach((area) => areasById.set(area.id, area));

      items.push({
        id: item.id,
        description: item.description,
        quantity,
        areas: itemAreas.map((area) => area.name),
      });
    }

    const workOrder = order.workOrders[0];
    const advisorName = [order.createdBy.firstName, order.createdBy.lastName]
      .filter(Boolean)
      .join(' ');

    return {
      id: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      orderDate: order.orderDate.toISOString(),
      deliveryDate: order.deliveryDate ? order.deliveryDate.toISOString() : null,
      total: Number(order.total),
      balance: Number(order.balance),
      clientName: order.client.name,
      advisor: { id: order.createdBy.id, name: advisorName || 'Sin nombre' },
      isCounterSale: order._count.dtfRecords > 0,
      workOrder: workOrder
        ? { id: workOrder.id, number: workOrder.workOrderNumber, status: workOrder.status }
        : null,
      areas: [...areasById.values()],
      items,
    };
  }
}
