export type DiscountApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface DiscountApproval {
  id: string;
  orderId: string;
  discountId: string;
  status: DiscountApprovalStatus;
  reviewNotes: string | null;
  reviewedAt: string | null;
  createdAt: string;
  requestedBy: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string;
  };
  reviewedBy?: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string;
  } | null;
  order: {
    id: string;
    orderNumber: string;
    status?: string;
    total?: string;
  };
  discount?: {
    id: string;
    amount: string;
    reason: string | null;
  } | null;
}
