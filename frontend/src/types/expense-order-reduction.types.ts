import type { ExpenseOrderStatus } from './expense-order.types';

export type ReductionMoneyLocation = 'SUPPLIER_RETURNS' | 'NEVER_LEFT';

export interface ReductionItemInput {
  itemId: string;
  quantity: number;
  unitPrice: number;
}

export interface ExpenseOrderReductionPlan {
  expenseOrder: { id: string; ogNumber: string; status: ExpenseOrderStatus };
  moneyLocation: ReductionMoneyLocation;
  items: Array<{
    id: string;
    name: string;
    previousQuantity: string;
    previousUnitPrice: string;
    previousTotal: string;
    quantity: number;
    unitPrice: number;
    total: string;
  }>;
  previousTotal: string;
  newTotal: string;
  paid: string;
  difference: string;
  adjustments: Array<{
    movementId: string;
    receiptNumber: string;
    paymentMethod: string;
    amountBefore: string;
    amountAfter: string;
    session: { id: string; status: string; cashRegisterName: string; closedAt: string | null };
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
  accountPayable: { id: string; apNumber: string } | null;
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

export interface ExpenseOrderReductionRequest {
  id: string;
  expenseOrderId: string;
  requestedById: string;
  reason: string;
  newItems: ReductionItemInput[];
  previousTotal: string;
  newTotal: string;
  difference: string;
  moneyLocation: ReductionMoneyLocation;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXPIRED';
  reviewedAt: string | null;
  reviewNotes: string | null;
  appliedAt: string | null;
  refundReceivedAt: string | null;
  createdAt: string;
  requestedBy: UserRef;
  reviewedBy: UserRef | null;
  refundReceivedBy: UserRef | null;
  refundMovement: { id: string; receiptNumber: string; paymentMethod: string; createdAt: string } | null;
  expenseOrder: { id: string; ogNumber: string; status: ExpenseOrderStatus; createdById: string };
  plan?: ExpenseOrderReductionPlan | null;
}

export interface CreateExpenseOrderReductionDto {
  items: ReductionItemInput[];
  moneyLocation: ReductionMoneyLocation;
  reason: string;
}

export interface RegisterReductionRefundDto {
  paymentMethod: string;
  notes?: string;
}
