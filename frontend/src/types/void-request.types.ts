import type { CashMovementType } from './cash-register.types';

export interface CashMovementVoidRequest {
  id: string;
  /**
   * La solicitud apunta a un movimiento de caja O a un pago suelto: un tercio de
   * los pagos nunca llega a caja (se registran sin caja abierta o salen de saldo
   * a favor) y también hay que poder anularlos. Nunca vienen los dos en null.
   */
  cashMovementId: string | null;
  paymentId: string | null;
  voidReason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  requestedBy: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
  };
  reviewedBy?: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
  } | null;
  reviewedAt?: string | null;
  reviewNotes?: string | null;
  createdAt: string;
  updatedAt: string;
  cashMovement?: {
    id: string;
    receiptNumber: string;
    amount: string;
    movementType: CashMovementType;
    description: string;
    paymentMethod: string;
  } | null;
  payment?: {
    id: string;
    amount: string;
    paymentMethod: string;
    paymentDate: string;
    order: { id: string; orderNumber: string } | null;
  } | null;
}

export interface CreateVoidRequestDto {
  voidReason: string;
}

export interface ReviewVoidRequestDto {
  reviewNotes?: string;
}
