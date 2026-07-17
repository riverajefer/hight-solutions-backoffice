export type DtfStatus =
  | 'BORRADOR'
  | 'ENVIADA'
  | 'EN_IMPRESION'
  | 'COMPLETADA'
  | 'CONVERTIDA_EN_OP';

export const DTF_STATUS_LABELS: Record<DtfStatus, string> = {
  BORRADOR: 'Borrador',
  ENVIADA: 'Enviada',
  EN_IMPRESION: 'En Impresión',
  COMPLETADA: 'Completada',
  CONVERTIDA_EN_OP: 'Convertida en OP',
};

export type DtfPaymentMethod = 'CASH' | 'TRANSFER';

export const DTF_PAYMENT_METHOD_LABELS: Record<DtfPaymentMethod, string> = {
  CASH: 'Efectivo',
  TRANSFER: 'Transferencia',
};

export interface DtfProduct {
  id: string;
  name: string;
  basePrice: number | null;
  priceUnit?: string | null;
}

export interface DtfClient {
  id: string;
  name: string;
  phone?: string | null;
  landlinePhone?: string | null;
  email?: string | null;
  address?: string | null;
  nit?: string | null;
  personType?: string | null;
  city?: { name: string } | null;
}

export interface DtfOrder {
  id: string;
  orderNumber: string;
}

export interface DtfCreatedBy {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
}

export interface DtfRecord {
  id: string;
  consecutive: string;
  quantity: number;
  unitPrice: number;
  value: number;
  abono: number;
  abonoPaymentMethod?: DtfPaymentMethod | null;
  abonoNotes?: string | null;
  status: DtfStatus;
  notes?: string | null;
  product: DtfProduct;
  client: DtfClient;
  order?: DtfOrder | null;
  createdBy: DtfCreatedBy;
  createdAt: string;
  updatedAt: string;
}

export interface DtfFile {
  id: string;
  originalName: string;
  fileName: string;
  mimeType: string;
  size: number;
  url: string;
}

export interface DtfFiles {
  images: DtfFile[];
  comprobantes: DtfFile[];
}

export interface DtfListResponse {
  data: DtfRecord[];
  total: number;
  page: number;
  limit: number;
}

export interface DtfListFilters {
  status?: DtfStatus;
  productId?: string;
  clientId?: string;
  /** Fecha de creación desde (ISO 8601). */
  createdAtFrom?: string;
  /** Fecha de creación hasta (ISO 8601). */
  createdAtTo?: string;
  page?: number;
  limit?: number;
}

export interface CreateDtfItemDto {
  productId: string;
  clientId: string;
  quantity: number;
  unitPrice?: number;
  abono?: number;
  abonoPaymentMethod?: DtfPaymentMethod;
  abonoNotes?: string;
  notes?: string;
}

export interface BulkCreateDtfDto {
  items: CreateDtfItemDto[];
}

export interface UpdateDtfRecordDto {
  clientId?: string;
  quantity?: number;
  unitPrice?: number;
  abono?: number;
  abonoPaymentMethod?: DtfPaymentMethod;
  abonoNotes?: string;
  notes?: string;
}

export interface ChangeDtfStatusDto {
  status: DtfStatus;
}

export interface DtfStatusHistoryEntry {
  id: string;
  fromStatus: DtfStatus | null;
  toStatus: DtfStatus;
  changedAt: string;
  changedBy: {
    id: string;
    firstName: string | null;
    lastName: string | null;
  };
}

export interface DtfFormItem {
  _localId: string;
  // populated after individual save
  id?: string;
  consecutive?: string;
  status?: DtfStatus;
  // form fields
  productId: string;
  clientId: string;
  quantity: number;
  notes: string;
  unitPrice: number;
  value: number;
  abono: number;
  abonoPaymentMethod: DtfPaymentMethod | '';
  abonoNotes: string;
  // files
  imageFile?: File | null;
  imagePreviewUrl?: string | null;
  comprobanteFile?: File | null;
  comprobantePreviewUrl?: string | null;
}
