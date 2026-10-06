import type { OrderStatus } from './order.types';
import type { WorkOrderStatus } from './work-order.types';

export interface ProductionBoardArea {
  id: string;
  name: string;
}

export interface ProductionBoardItem {
  id: string;
  description: string;
  quantity: number;
  areas: string[];
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
  areas: ProductionBoardArea[];
  items: ProductionBoardItem[];
}

export interface ProductionBoardResponse {
  generatedAt: string;
  cutoffDate: string;
  staleOpenCount: number;
  cards: ProductionBoardCard[];
}

export type BoardView = 'status' | 'advisor';

export type Semaphore = 'overdue' | 'warning' | 'on-time' | 'no-date';

export interface BoardFilters {
  view: BoardView;
  advisorIds: string[];
  areaId: string | null;
  /** Valor mínimo de la orden, tal como se teclea en el campo de moneda. */
  minTotal: string;
  hideCounterSales: boolean;
  showDrafts: boolean;
  semaphore: Semaphore | null;
  search: string;
}

export interface BoardColumnData {
  id: string;
  title: string;
  /** Color del borde del encabezado (clave de paleta o color CSS). */
  color: string;
  cards: ProductionBoardCard[];
  counterSales: ProductionBoardCard[];
}

export type SemaphoreSummary = Record<Semaphore, number>;
