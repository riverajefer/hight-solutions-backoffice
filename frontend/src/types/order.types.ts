// ============================================================
// ENUMS
// ============================================================

export type OrderStatus =
  | 'DRAFT'
  | 'CONFIRMED'
  | 'IN_PRODUCTION'
  | 'READY'
  | 'DELIVERED'
  | 'DELIVERED_ON_CREDIT'
  | 'WARRANTY'
  | 'RETURNED'
  | 'PAID';

export type PaymentMethod = 'CASH' | 'TRANSFER' | 'CARD' | 'CHECK' | 'CREDIT' | 'OTHER';

// ============================================================
// ENTITIES
// ============================================================

export interface Order {
  id: string;
  orderNumber: string;
  orderDate: string;
  deliveryDate: string | null;

  // Auditoría de cambios de fecha de entrega
  previousDeliveryDate?: string | null;
  deliveryDateReason?: string | null;
  deliveryDateChangedAt?: string | null;
  deliveryDateChangedBy?: string | null;
  deliveryDateChangedByUser?: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
  } | null;

  subtotal: string; // Decimal viene como string del backend
  taxRate: string;
  tax: string;
  discountAmount: string; // Total de descuentos aplicados
  total: string;
  paidAmount: string;
  balance: string;
  status: OrderStatus;
  notes: string | null;
  electronicInvoiceNumber: string | null;
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
  commercialChannelId: string | null;
  commercialChannel: {
    id: string;
    name: string;
  } | null;
  items: OrderItem[];
  payments: Payment[];
  discounts: OrderDiscount[];
}

export interface CommercialChannel {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface OrderItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: string; // Decimal
  total: string; // Decimal
  specifications: Record<string, any> | null;
  sampleImageId?: string;
  sortOrder: number;
  product: {
    id: string;
    name: string;
    slug: string;
  } | null;
  productionAreas: {
    productionArea: {
      id: string;
      name: string;
    };
  }[];
}

export interface Payment {
  id: string;
  amount: string; // Decimal
  paymentMethod: PaymentMethod;
  paymentDate: string;
  reference: string | null;
  notes: string | null;
  receiptFileId: string | null;
  createdAt: string;
  receivedBy: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
  };
}

export interface OrderDiscount {
  id: string;
  amount: string; // Decimal
  reason: string; // Motivo del descuento (obligatorio)
  appliedAt: string; // Fecha de aplicación
  appliedBy: {
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
  productId?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  specifications?: Record<string, any>;
  productionAreaIds?: string[];
}

export interface CreateOrderDto {
  clientId: string;
  deliveryDate?: string; // ISO date string
  notes?: string;
  items: CreateOrderItemDto[];
  initialPayment?: InitialPaymentDto;
  commercialChannelId?: string;
}

// ============================================================
// DTOs - UPDATE
// ============================================================

export interface UpdateOrderDto {
  clientId?: string;
  deliveryDate?: string;
  notes?: string;
  items?: CreateOrderItemDto[];
  initialPayment?: InitialPaymentDto;
  commercialChannelId?: string;
}

export interface UpdateOrderStatusDto {
  status: OrderStatus;
}

export interface AddOrderItemDto {
  productId?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  specifications?: Record<string, any>;
  productionAreaIds?: string[];
}

export interface UpdateOrderItemDto {
  description?: string;
  quantity?: number;
  unitPrice?: number;
  specifications?: Record<string, any>;
  productId?: string;
  productionAreaIds?: string[];
}

export interface CreatePaymentDto {
  amount: number;
  paymentMethod: PaymentMethod;
  paymentDate?: string; // ISO date string
  reference?: string;
  notes?: string;
  receiptFileId?: string;
}

export interface ApplyDiscountDto {
  amount: number;
  reason: string; // Motivo del descuento (obligatorio)
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
  productId?: string;
  specifications?: Record<string, any>;
  productionAreaIds: string[];
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
  READY: { label: 'Lista para entrega', color: 'success' },
  DELIVERED: { label: 'Entregada', color: 'primary' },
  DELIVERED_ON_CREDIT: { label: 'Entregado a Crédito', color: 'warning' },
  WARRANTY: { label: 'Garantía', color: 'secondary' },
  RETURNED: { label: 'Devolución', color: 'error' },
  PAID: { label: 'Pagada', color: 'success' },
};

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  CASH: 'Efectivo',
  TRANSFER: 'Transferencia',
  CARD: 'Tarjeta',
  CHECK: 'Cheque',
  CREDIT: 'Crédito',
  OTHER: 'Otro',
};
