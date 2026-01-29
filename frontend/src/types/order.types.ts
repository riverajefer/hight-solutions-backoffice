// ============================================================
// ENUMS
// ============================================================

export type OrderStatus =
  | 'DRAFT'
  | 'CONFIRMED'
  | 'IN_PRODUCTION'
  | 'READY'
  | 'DELIVERED'
  | 'CANCELLED';

export type PaymentMethod = 'CASH' | 'TRANSFER' | 'CARD' | 'CHECK' | 'OTHER';

// ============================================================
// ENTITIES
// ============================================================

export interface Order {
  id: string;
  orderNumber: string;
  orderDate: string;
  deliveryDate: string | null;
  subtotal: string; // Decimal viene como string del backend
  taxRate: string;
  tax: string;
  total: string;
  paidAmount: string;
  balance: string;
  status: OrderStatus;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  client: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
  };
  createdBy: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
  };
  items: OrderItem[];
  payments: Payment[];
}

export interface OrderItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: string; // Decimal
  total: string; // Decimal
  specifications: Record<string, any> | null;
  sortOrder: number;
  service: {
    id: string;
    name: string;
    slug: string;
  } | null;
}

export interface Payment {
  id: string;
  amount: string; // Decimal
  paymentMethod: PaymentMethod;
  paymentDate: string;
  reference: string | null;
  notes: string | null;
  createdAt: string;
  receivedBy: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
  };
}

// ============================================================
// DTOs - CREATE
// ============================================================

export interface InitialPaymentDto {
  amount: number;
  paymentMethod: PaymentMethod;
  reference?: string;
  notes?: string;
}

export interface CreateOrderItemDto {
  serviceId?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  specifications?: Record<string, any>;
}

export interface CreateOrderDto {
  clientId: string;
  deliveryDate?: string; // ISO date string
  notes?: string;
  items: CreateOrderItemDto[];
  initialPayment?: InitialPaymentDto;
}

// ============================================================
// DTOs - UPDATE
// ============================================================

export interface UpdateOrderDto {
  clientId?: string;
  deliveryDate?: string;
  notes?: string;
}

export interface UpdateOrderStatusDto {
  status: OrderStatus;
}

export interface AddOrderItemDto {
  serviceId?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  specifications?: Record<string, any>;
}

export interface UpdateOrderItemDto {
  description?: string;
  quantity?: number;
  unitPrice?: number;
  specifications?: Record<string, any>;
  serviceId?: string;
}

export interface CreatePaymentDto {
  amount: number;
  paymentMethod: PaymentMethod;
  paymentDate?: string; // ISO date string
  reference?: string;
  notes?: string;
}

// ============================================================
// DTOs - FILTER
// ============================================================

export interface FilterOrdersDto {
  status?: OrderStatus;
  clientId?: string;
  orderDateFrom?: string; // ISO date string
  orderDateTo?: string; // ISO date string
  page?: number;
  limit?: number;
}

// ============================================================
// RESPONSES
// ============================================================

export interface OrdersListResponse {
  data: Order[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

// ============================================================
// UI HELPERS
// ============================================================

export interface OrderItemRow {
  id: string; // UUID temporal para manejo en UI
  description: string;
  quantity: string; // String en UI para inputs controlados
  unitPrice: string; // String en UI
  total: number; // Calculado
  serviceId?: string;
  specifications?: Record<string, any>;
}

export interface InitialPaymentData {
  amount: number;
  paymentMethod: PaymentMethod;
  reference?: string;
  notes?: string;
}

// ============================================================
// STATUS CONFIG
// ============================================================

export interface OrderStatusConfig {
  label: string;
  color:
    | 'default'
    | 'primary'
    | 'secondary'
    | 'error'
    | 'info'
    | 'success'
    | 'warning';
}

export const ORDER_STATUS_CONFIG: Record<OrderStatus, OrderStatusConfig> = {
  DRAFT: { label: 'Borrador', color: 'default' },
  CONFIRMED: { label: 'Confirmada', color: 'info' },
  IN_PRODUCTION: { label: 'En Producción', color: 'warning' },
  READY: { label: 'Lista', color: 'success' },
  DELIVERED: { label: 'Entregada', color: 'primary' },
  CANCELLED: { label: 'Cancelada', color: 'error' },
};

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  CASH: 'Efectivo',
  TRANSFER: 'Transferencia',
  CARD: 'Tarjeta',
  CHECK: 'Cheque',
  OTHER: 'Otro',
};
