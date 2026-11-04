import type { CashMovementType } from './cash-register.types';

/** Ver docs/PROPUESTA_TRASLADO_MOVIMIENTOS_CAJA.md. */
export interface CashTransferPreview {
  movement: {
    id: string;
    receiptNumber: string;
    movementType: CashMovementType;
    paymentMethod: string;
    amount: string;
    description: string;
    createdAt: string;
    expenseOrder: { id: string; ogNumber: string } | null;
  };
  sourceSession: {
    id: string;
    cashRegisterName: string;
    openedAt: string;
    closedAt: string | null;
  };
  targetSession: { id: string; openedAt: string } | null;
  effect: {
    systemBalanceBefore: string;
    systemBalanceAfter: string;
    discrepancyBefore: string;
    discrepancyAfter: string;
    worsens: boolean;
    /** Cuánto cambia lo que espera la caja de hoy (+ más efectivo, − menos). */
    targetExpectedChange: string;
  } | null;
  /** Si viene, no se puede pedir el traslado. */
  ineligibleReason: string | null;
  /** Si viene, se puede pedir pero no aplicar todavía. */
  targetIssue: string | null;
  crossesMonth: boolean;
  sourceMonthLabel: string | null;
  pendingRequestId: string | null;
  appliedRequestId: string | null;
}

interface UserRef {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
}

export interface CashTransferRequest {
  id: string;
  cashMovementId: string;
  sourceSessionId: string;
  targetSessionId: string | null;
  reason: string;
  cashStayedInDrawer: boolean;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXPIRED';
  reviewNotes: string | null;
  reviewedAt: string | null;
  sourceSystemBalanceBefore: string | null;
  sourceSystemBalanceAfter: string | null;
  sourceDiscrepancyBefore: string | null;
  sourceDiscrepancyAfter: string | null;
  appliedAt: string | null;
  createdAt: string;
  requestedBy: UserRef;
  reviewedBy: UserRef | null;
  cashMovement: {
    id: string;
    receiptNumber: string;
    movementType: CashMovementType;
    paymentMethod: string;
    amount: string;
    description: string;
    referenceType: string | null;
    referenceId: string | null;
    createdAt: string;
  };
  sourceSession: {
    id: string;
    openedAt: string;
    closedAt: string | null;
    closingAmount: string | null;
    systemBalance: string | null;
    discrepancy: string | null;
    cashRegister: { id: string; name: string };
  };
  targetSession: { id: string; openedAt: string; status: string } | null;
  /** Solo en pendientes: el efecto calculado hoy. */
  preview?: CashTransferPreview | null;
}

export interface CreateCashTransferRequestDto {
  reason: string;
  cashStayedInDrawer: boolean;
}

export interface ReviewCashTransferRequestDto {
  reviewNotes?: string;
}
