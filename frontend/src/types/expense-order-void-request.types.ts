import type { ExpenseOrderStatus } from './expense-order.types';

/** Lo que tocaría anular una OG, calculado por el backend. */
export interface ExpenseOrderVoidPlan {
  expenseOrder: { id: string; ogNumber: string; status: ExpenseOrderStatus; createdById: string };
  movements: Array<{
    id: string;
    receiptNumber: string;
    movementType: string;
    paymentMethod: string;
    amount: string;
    createdAt: string;
    session: {
      id: string;
      status: string;
      cashRegisterName: string;
      openedAt: string;
      closedAt: string | null;
    };
    blocker: string | null;
    applyIssue: string | null;
  }>;
  closings: Array<{
    sessionId: string;
    cashRegisterName: string;
    closedAt: string;
    receipts: string[];
    systemBalanceBefore: string;
    systemBalanceAfter: string;
    discrepancyBefore: string;
    discrepancyAfter: string;
    worsens: boolean;
    crossesMonth: boolean;
    monthLabel: string;
  }>;
  openSessionsCashChange: string;
  accountPayable: {
    id: string;
    apNumber: string;
    status: string;
    paidAmount: string;
    paymentsToReverse: number;
  } | null;
  lots: Array<{
    id: string;
    code: string;
    status: string;
    alreadyVoided: boolean;
    used: boolean;
    consumedByOrders: string[];
  }>;
  hasLiveMovements: boolean;
  ineligibleReason: string | null;
  applyIssue: string | null;
  pendingRequestId: string | null;
}

interface UserRef {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
}

export interface ExpenseOrderVoidRequest {
  id: string;
  expenseOrderId: string;
  requestedById: string;
  reason: string;
  cashStayedInDrawer: boolean | null;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXPIRED';
  reviewedById: string | null;
  reviewedAt: string | null;
  reviewNotes: string | null;
  appliedAt: string | null;
  createdAt: string;
  requestedBy: UserRef;
  reviewedBy: UserRef | null;
  expenseOrder: { id: string; ogNumber: string; status: ExpenseOrderStatus; createdById: string };
  /** Solo en la bandeja del admin, para las pendientes. */
  plan?: ExpenseOrderVoidPlan | null;
}

export interface CreateExpenseOrderVoidRequestDto {
  reason: string;
  cashStayedInDrawer?: boolean;
}

export interface ReviewExpenseOrderVoidRequestDto {
  reviewNotes?: string;
}
