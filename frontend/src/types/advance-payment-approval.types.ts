export type AdvancePaymentApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface AdvancePaymentApproval {
  id: string;
  orderId: string;
  paymentId: string;
  reason: string | null;
  status: AdvancePaymentApprovalStatus;
  reviewNotes: string | null;
  reviewedAt: string | null;
  createdAt: string;
  requestedBy: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string;
  };
  reviewedBy: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string;
  } | null;
  order: {
    id: string;
    orderNumber: string;
    status: string;
    total?: string;
    paidAmount?: string;
  };
  payment: {
    id: string;
    amount: string;
    paymentMethod: string;
    reference?: string | null;
    notes?: string | null;
  };
}
