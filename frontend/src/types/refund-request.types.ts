export type RefundRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
export type RefundPaymentMethod = 'CASH' | 'TRANSFER' | 'CARD';

export interface RefundRequestUser {
  id: string;
  email?: string;
  firstName?: string;
  lastName?: string;
}

export interface RefundRequestOrder {
  id: string;
  orderNumber: string;
  status?: string;
  total?: string;
  paidAmount?: string;
  balance?: string;
  client?: { id: string; name: string };
}

export interface RefundRequestCashMovement {
  id: string;
  receiptNumber?: string;
  amount: string;
  paymentMethod: RefundPaymentMethod;
  movementType?: string;
  createdAt?: string;
}

export interface RefundRequest {
  id: string;
  orderId: string;
  refundAmount: string;
  paymentMethod: RefundPaymentMethod;
  observation: string;
  status: RefundRequestStatus;

  requestedById: string;
  requestedBy?: RefundRequestUser;
  requestedAt: string;

  reviewedById?: string;
  reviewedBy?: RefundRequestUser;
  reviewedAt?: string;
  reviewNotes?: string;

  executedAt?: string;
  cashMovementId?: string;
  cashMovement?: RefundRequestCashMovement;

  order?: RefundRequestOrder;

  createdAt: string;
  updatedAt: string;
}

export interface CreateRefundRequestDto {
  orderId: string;
  refundAmount: number;
  paymentMethod: RefundPaymentMethod;
  observation: string;
}

export interface ApproveRefundRequestDto {
  reviewNotes?: string;
}

export interface RejectRefundRequestDto {
  reviewNotes: string;
}
