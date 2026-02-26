export type OrderNodeType = 'COT' | 'OP' | 'OT' | 'OG';

export interface OrderTreeNode {
  id: string;
  type: OrderNodeType;
  number: string;
  status: string;
  clientName: string;
  total: number | null;
  detailPath: string;
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
