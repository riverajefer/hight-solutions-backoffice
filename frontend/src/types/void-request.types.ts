import type { CashMovementType } from './cash-register.types';

export interface CashMovementVoidRequest {
  id: string;
  cashMovementId: string;
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
  };
}

export interface CreateVoidRequestDto {
  voidReason: string;
}

export interface ReviewVoidRequestDto {
  reviewNotes?: string;
}
