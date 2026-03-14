// ─── Enums ────────────────────────────────────────────────────────────────────

export enum ExpenseOrderStatus {
  DRAFT = 'DRAFT',
  CREATED = 'CREATED',
  AUTHORIZED = 'AUTHORIZED',
  PAID = 'PAID',
}

export enum PaymentMethod {
  CASH = 'CASH',
  TRANSFER = 'TRANSFER',
  CARD = 'CARD',
  CHECK = 'CHECK',
  CREDIT = 'CREDIT',
  OTHER = 'OTHER',
}

// ─── Status Config ────────────────────────────────────────────────────────────

export interface ExpenseOrderStatusConfig {
  label: string;
  color: 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning';
}

export const EXPENSE_ORDER_STATUS_CONFIG: Record<ExpenseOrderStatus, ExpenseOrderStatusConfig> = {
  [ExpenseOrderStatus.DRAFT]: { label: 'Borrador', color: 'default' },
  [ExpenseOrderStatus.CREATED]: { label: 'Creada', color: 'info' },
  [ExpenseOrderStatus.AUTHORIZED]: { label: 'Autorizada', color: 'warning' },
  [ExpenseOrderStatus.PAID]: { label: 'Pagada', color: 'success' },
};

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  [PaymentMethod.CASH]: 'Efectivo',
  [PaymentMethod.TRANSFER]: 'Transferencia',
  [PaymentMethod.CARD]: 'Tarjeta',
  [PaymentMethod.CHECK]: 'Cheque',
  [PaymentMethod.CREDIT]: 'Crédito',
  [PaymentMethod.OTHER]: 'Otro',
};

// ─── Catalog entities ─────────────────────────────────────────────────────────

export interface ExpenseSubcategory {
  id: string;
  name: string;
  description?: string | null;
  expenseType: {
    id: string;
    name: string;
  };
}

export interface ExpenseType {
  id: string;
  name: string;
  description?: string | null;
  subcategories: ExpenseSubcategory[];
}

// ─── Core entities ────────────────────────────────────────────────────────────

export interface ExpenseOrderItemProductionArea {
  productionArea: {
    id: string;
    name: string;
  };
}

export interface ExpenseOrderItem {
  id: string;
  quantity: string;
  name: string;
  description?: string | null;
  unitPrice: string;
  total: string;
  paymentMethod: PaymentMethod;
  receiptFileId?: string | null;
  sortOrder: number;
  supplier?: {
    id: string;
    name: string;
    email: string;
  } | null;
  productionAreas: ExpenseOrderItemProductionArea[];
}

export interface ExpenseOrder {
  id: string;
  ogNumber: string;
  status: ExpenseOrderStatus;
  observations?: string | null;
  areaOrMachine?: string | null;
  createdAt: string;
  updatedAt: string;
  expenseType: {
    id: string;
    name: string;
  };
  expenseSubcategory: {
    id: string;
    name: string;
  };
  workOrder?: {
    id: string;
    workOrderNumber: string;
    status: string;
    fileName?: string | null;
    observations?: string | null;
    advisor: {
      id: string;
      firstName?: string | null;
      lastName?: string | null;
      email: string;
    };
    designer?: {
      id: string;
      firstName?: string | null;
      lastName?: string | null;
      email: string;
    } | null;
    order: {
      id: string;
      orderNumber: string;
      status: string;
      deliveryDate?: string | null;
      total: string;
      paidAmount: string;
      balance: string;
      client: {
        id: string;
        name: string;
      };
    };
  } | null;
  authorizedTo: {
    id: string;
    firstName?: string | null;
    lastName?: string | null;
    email: string;
  };
  responsible?: {
    id: string;
    firstName?: string | null;
    lastName?: string | null;
    email: string;
  } | null;
  createdBy: {
    id: string;
    firstName?: string | null;
    lastName?: string | null;
    email: string;
  };
  authorizedById?: string | null;
  authorizedAt?: string | null;
  authorizedBy?: {
    id: string;
    firstName?: string | null;
    lastName?: string | null;
    email: string;
  } | null;
  items: ExpenseOrderItem[];
}

// ─── List response ────────────────────────────────────────────────────────────

export interface ExpenseOrdersListResponse {
  data: ExpenseOrder[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

// ─── DTOs ─────────────────────────────────────────────────────────────────────

export interface CreateExpenseItemDto {
  quantity: number;
  name: string;
  description?: string;
  supplierId?: string;
  unitPrice: number;
  paymentMethod: PaymentMethod;
  productionAreaIds?: string[];
  receiptFileId?: string;
}

export interface CreateExpenseOrderDto {
  expenseTypeId: string;
  expenseSubcategoryId: string;
  workOrderId?: string;
  authorizedToId: string;
  responsibleId?: string;
  observations?: string;
  areaOrMachine?: string;
  items: CreateExpenseItemDto[];
}

export interface UpdateExpenseItemDto {
  id?: string;
  quantity?: number;
  name?: string;
  description?: string;
  supplierId?: string;
  unitPrice?: number;
  paymentMethod?: PaymentMethod;
  productionAreaIds?: string[];
  receiptFileId?: string;
}

export interface UpdateExpenseOrderDto {
  expenseTypeId?: string;
  expenseSubcategoryId?: string;
  workOrderId?: string | null;
  authorizedToId?: string;
  responsibleId?: string | null;
  observations?: string;
  areaOrMachine?: string;
  items?: UpdateExpenseItemDto[];
}

export interface UpdateExpenseOrderStatusDto {
  status: ExpenseOrderStatus;
}

export interface FilterExpenseOrdersDto {
  status?: ExpenseOrderStatus;
  workOrderId?: string;
  expenseTypeId?: string;
  search?: string;
  page?: number;
  limit?: number;
}
