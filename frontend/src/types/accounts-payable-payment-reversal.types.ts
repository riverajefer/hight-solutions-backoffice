export enum ApPaymentReversalStatus {
  PENDING_GERENCIA = 'PENDING_GERENCIA',
  PENDING_CAJA = 'PENDING_CAJA',
  COMPLETED = 'COMPLETED',
  REJECTED_BY_GERENCIA = 'REJECTED_BY_GERENCIA',
  REJECTED_BY_CAJA = 'REJECTED_BY_CAJA',
}

export interface ApPaymentReversalStatusConfig {
  label: string;
  color: 'default' | 'warning' | 'info' | 'success' | 'error';
}

export const AP_REVERSAL_STATUS_CONFIG: Record<ApPaymentReversalStatus, ApPaymentReversalStatusConfig> = {
  [ApPaymentReversalStatus.PENDING_GERENCIA]:    { label: 'Pendiente Gerencia', color: 'warning' },
  [ApPaymentReversalStatus.PENDING_CAJA]:        { label: 'Pendiente Caja',     color: 'info' },
  [ApPaymentReversalStatus.COMPLETED]:           { label: 'Completada',         color: 'success' },
  [ApPaymentReversalStatus.REJECTED_BY_GERENCIA]:{ label: 'Rechazada (Gerencia)', color: 'error' },
  [ApPaymentReversalStatus.REJECTED_BY_CAJA]:    { label: 'Rechazada (Caja)',   color: 'error' },
};

type UserMin = { id: string; firstName?: string | null; lastName?: string | null; email?: string | null };

export interface AccountPayablePaymentReversalRequest {
  id: string;
  reason: string;
  status: ApPaymentReversalStatus;

  gerenciaReviewedById?: string | null;
  gerenciaReviewedAt?: string | null;
  gerenciaRejectionNotes?: string | null;

  cajaReviewedById?: string | null;
  cajaReviewedAt?: string | null;
  cajaRejectionNotes?: string | null;

  paymentAuthRequestId: string;
  requestedById: string;
  createdAt: string;
  updatedAt: string;

  requestedBy: UserMin;
  gerenciaReviewedBy?: UserMin | null;
  cajaReviewedBy?: UserMin | null;
  paymentAuthRequest?: {
    id: string;
    amount: string;
    paymentMethod: string;
    paymentDate: string;
    accountPayable?: {
      id: string;
      apNumber: string;
      totalAmount?: string;
      balance?: string;
      description?: string;
    };
    createdPayment?: {
      id: string;
      amount: string;
      isReversed: boolean;
      reversedAt?: string | null;
    } | null;
  };
}

export interface CreateApPaymentReversalRequestDto {
  paymentAuthRequestId: string;
  reason: string;
}

export interface GerenciaRejectApPaymentReversalDto {
  rejectionNotes?: string;
}

export interface CajaRejectApPaymentReversalDto {
  rejectionNotes?: string;
}
