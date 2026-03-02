export type ExpenseOrderAuthRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface ExpenseOrderAuthRequest {
  id: string;
  expenseOrderId: string;
  reason: string | null;
  status: ExpenseOrderAuthRequestStatus;
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
  expenseOrder: {
    id: string;
    ogNumber: string;
    status: string;
  };
}

export interface CreateExpenseOrderAuthRequestDto {
  expenseOrderId: string;
  reason?: string;
}
