// ─── Enums ────────────────────────────────────────────────────────────────────

export enum AccountPayableStatus {
  PENDING = 'PENDING',
  PARTIAL = 'PARTIAL',
  PAID = 'PAID',
  OVERDUE = 'OVERDUE',
  CANCELLED = 'CANCELLED',
}

export enum AccountPayableType {
  RENT = 'RENT',
  PUBLIC_SERVICES = 'PUBLIC_SERVICES',
  BANK_CREDIT = 'BANK_CREDIT',
  SUPPLIER = 'SUPPLIER',
  THIRD_PARTY_SERVICE = 'THIRD_PARTY_SERVICE',
  PAYROLL = 'PAYROLL',
  TAX = 'TAX',
  MAINTENANCE = 'MAINTENANCE',
  SUBSCRIPTION = 'SUBSCRIPTION',
  TRANSPORT = 'TRANSPORT',
  OTHER = 'OTHER',
}

// ─── Status Config ────────────────────────────────────────────────────────────

export interface AccountPayableStatusConfig {
  label: string;
  color: 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning';
}

export const ACCOUNT_PAYABLE_STATUS_CONFIG: Record<AccountPayableStatus, AccountPayableStatusConfig> = {
  [AccountPayableStatus.PENDING]:   { label: 'Pendiente', color: 'warning' },
  [AccountPayableStatus.PARTIAL]:   { label: 'Abonada',   color: 'info' },
  [AccountPayableStatus.PAID]:      { label: 'Pagada',    color: 'success' },
  [AccountPayableStatus.OVERDUE]:   { label: 'Vencida',   color: 'error' },
  [AccountPayableStatus.CANCELLED]: { label: 'Anulada',   color: 'default' },
};

export const ACCOUNT_PAYABLE_TYPE_LABELS: Record<AccountPayableType, string> = {
  [AccountPayableType.RENT]:                'Arriendo',
  [AccountPayableType.PUBLIC_SERVICES]:     'Servicios Públicos',
  [AccountPayableType.BANK_CREDIT]:         'Crédito Bancario',
  [AccountPayableType.SUPPLIER]:            'Proveedor',
  [AccountPayableType.THIRD_PARTY_SERVICE]: 'Servicio de Terceros',
  [AccountPayableType.PAYROLL]:             'Nómina / Honorarios',
  [AccountPayableType.TAX]:                 'Impuestos',
  [AccountPayableType.MAINTENANCE]:         'Mantenimiento',
  [AccountPayableType.SUBSCRIPTION]:        'Suscripción',
  [AccountPayableType.TRANSPORT]:           'Transporte / Logística',
  [AccountPayableType.OTHER]:               'Otros',
};

// ─── Core entities ────────────────────────────────────────────────────────────

export interface AccountPayablePayment {
  id: string;
  amount: string;
  paymentMethod: string;
  paymentDate: string;
  reference?: string | null;
  notes?: string | null;
  receiptFileId?: string | null;
  cashMovementId?: string | null;
  createdAt: string;
  registeredBy: {
    id: string;
    firstName?: string | null;
    lastName?: string | null;
    email?: string | null;
  };
}

export interface AccountPayableInstallment {
  id: string;
  installmentNumber: number;
  amount: string;
  dueDate: string;
  isPaid: boolean;
  paidAt?: string | null;
  notes?: string | null;
  paidBy?: {
    id: string;
    firstName?: string | null;
    lastName?: string | null;
  } | null;
}

export interface AccountPayableAttachment {
  id: string;
  fileUrl: string;
  fileName: string;
  fileType?: string | null;
  createdAt: string;
  uploadedBy: {
    id: string;
    firstName?: string | null;
    lastName?: string | null;
  };
}

export interface AccountPayable {
  id: string;
  apNumber: string;
  type: AccountPayableType;
  status: AccountPayableStatus;
  description: string;
  observations?: string | null;
  totalAmount: string;
  paidAmount: string;
  balance: string;
  dueDate: string;
  isRecurring: boolean;
  recurringDay?: number | null;
  cancelledAt?: string | null;
  cancelReason?: string | null;
  supplier?: {
    id: string;
    name: string;
    email?: string;
    nit?: string | null;
  } | null;
  expenseOrder?: {
    id: string;
    ogNumber: string;
    status?: string;
    observations?: string | null;
    areaOrMachine?: string | null;
    createdAt?: string;
    expenseType?: { id: string; name: string };
    expenseSubcategory?: { id: string; name: string };
    createdBy?: { id: string; firstName?: string | null; lastName?: string | null; email?: string | null };
    items?: Array<{
      id: string;
      name: string;
      description?: string | null;
      quantity: string;
      unitPrice: string;
      total: string;
      paymentMethod?: string | null;
    }>;
  } | null;
  createdBy: {
    id: string;
    firstName?: string | null;
    lastName?: string | null;
    email?: string | null;
  };
  cancelledBy?: {
    id: string;
    firstName?: string | null;
    lastName?: string | null;
  } | null;
  createdAt: string;
  updatedAt: string;
  payments?: AccountPayablePayment[];
  attachments?: AccountPayableAttachment[];
  installments?: AccountPayableInstallment[];
}

export interface AccountPayableSummary {
  totalPending: number;
  totalOverdue: number;
  totalPartial: number;
  totalPaid: number;
  upcomingCount: number;
  totalAmountPending: string;
  totalAmountOverdue: string;
}

// ─── DTOs ─────────────────────────────────────────────────────────────────────

export interface CreateAccountPayableDto {
  type: AccountPayableType;
  description: string;
  observations?: string;
  totalAmount: number;
  dueDate: string;
  supplierId?: string;
  expenseOrderId?: string;
  isRecurring?: boolean;
  recurringDay?: number;
}

export interface UpdateAccountPayableDto {
  description?: string;
  observations?: string;
  totalAmount?: number;
  dueDate?: string;
  supplierId?: string;
  isRecurring?: boolean;
  recurringDay?: number;
}

export interface FilterAccountPayableDto {
  status?: AccountPayableStatus;
  type?: AccountPayableType;
  supplierId?: string;
  search?: string;
  dueDateFrom?: string;
  dueDateTo?: string;
  page?: number;
  limit?: number;
  orderBy?: 'dueDate' | 'totalAmount' | 'createdAt';
  orderDir?: 'asc' | 'desc';
}

export interface RegisterPaymentDto {
  amount: number;
  paymentMethod: string;
  paymentDate: string;
  reference?: string;
  notes?: string;
  receiptFileId?: string;
  cashSessionId?: string;
}

export interface CancelAccountPayableDto {
  cancelReason: string;
}

export interface CreateAttachmentDto {
  storageFileId: string;
  fileName: string;
  fileUrl: string;
  fileType?: string;
}

export interface InstallmentItemDto {
  amount: number;
  dueDate: string;
  notes?: string;
}

export interface SetInstallmentsDto {
  installments: InstallmentItemDto[];
}

export interface UpdateInstallmentDto {
  isPaid: boolean;
}

export interface AccountPayableListResponse {
  data: AccountPayable[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}
