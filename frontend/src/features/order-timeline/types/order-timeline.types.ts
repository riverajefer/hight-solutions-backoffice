export type OrderNodeType = 'COT' | 'OP' | 'OT' | 'OG';

export interface OrderTreeNode {
  id: string;
  type: OrderNodeType;
  number: string;
  status: string;
  clientName: string;
  total: number | null;
  detailPath: string;
  createdAt: string;
  /** ISO timestamp de cierre; solo presente en OT cuando su estado es terminal. */
  endedAt: string | null;
  /** Presente en COT y OP: nombre del usuario que creó el documento. */
  createdByName?: string | null;
  /** Solo presente en nodos COT: nombre del canal comercial asociado. */
  commercialChannelName?: string | null;
  /** Solo presente en nodos OP: saldo pendiente de pago. */
  pendingBalance?: number | null;
  /** Solo presente en nodos OT: nombre del asesor que gestiona la orden de trabajo. */
  advisorName?: string | null;
  /** Solo presente en nodos OT: nombre del diseñador asignado. */
  designerName?: string | null;
  /** Solo presente en nodos OG: usuario al que se le autoriza el gasto. */
  authorizedToName?: string | null;
  /** Solo presente en nodos OG: usuario responsable del gasto. */
  responsibleName?: string | null;
}

export interface OrderTreeEdge {
  source: string;
  target: string;
}

export interface OrderTreeResponse {
  nodes: OrderTreeNode[];
  edges: OrderTreeEdge[];
  rootId: string;
  focusedId: string;
}

export type EntityType = 'quote' | 'order' | 'work-order' | 'expense-order';

export interface SearchResultItem {
  id: string;
  type: OrderNodeType;
  number: string;
  status: string;
  clientName: string;
  entityType: EntityType;
}

export interface SearchResults {
  quotes: SearchResultItem[];
  orders: SearchResultItem[];
  workOrders: SearchResultItem[];
  expenseOrders: SearchResultItem[];
}
