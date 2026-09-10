/**
 * Descuento del valor de una OP sobre la nómina de un empleado.
 *
 * El dinero nunca pasa por caja: la empresa recupera el trabajo pagándole menos
 * al empleado en su quincena. La OP nace con saldo pendiente y solo se salda
 * cuando el descuento llega a `APPLIED`.
 */
export type PayrollDeductionStatus =
  | 'PENDING'
  | 'APPROVED'
  | 'REJECTED'
  | 'APPLIED'
  | 'CANCELLED';

export const PAYROLL_DEDUCTION_STATUS_LABELS: Record<
  PayrollDeductionStatus,
  { label: string; color: 'default' | 'info' | 'success' | 'error' | 'warning' }
> = {
  PENDING: { label: 'Pendiente de aprobación', color: 'warning' },
  APPROVED: { label: 'Aprobado, por aplicar', color: 'info' },
  REJECTED: { label: 'Rechazado', color: 'error' },
  APPLIED: { label: 'Aplicado en nómina', color: 'success' },
  CANCELLED: { label: 'Cancelado', color: 'default' },
};

interface DeductionUser {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  username: string | null;
}

export interface PayrollDeduction {
  id: string;
  orderId: string;
  employeeId: string;
  payrollItemId: string | null;
  paymentId: string | null;
  amount: string;
  status: PayrollDeductionStatus;
  approvedAt: string | null;
  rejectionReason: string | null;
  appliedAt: string | null;
  cancelledAt: string | null;
  cancelReason: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  order: {
    id: string;
    orderNumber: string;
    total: string;
    balance: string;
    status: string;
    client: { id: string; name: string };
  };
  employee: {
    id: string;
    firstName: string | null;
    firstLastName: string | null;
    status: string;
    user: DeductionUser;
  };
  payrollItem: {
    id: string;
    periodId: string;
    period: { id: string; name: string; status: string };
  } | null;
  requestedBy: DeductionUser;
  approvedBy: DeductionUser | null;
  appliedBy: DeductionUser | null;
}

export interface PayrollDeductionFilters {
  status?: PayrollDeductionStatus;
  employeeId?: string;
  periodId?: string;
  search?: string;
  onlyPending?: boolean;
  page?: number;
  limit?: number;
}

export interface PaginatedPayrollDeductions {
  data: PayrollDeduction[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ApplyPayrollDeductionDto {
  periodId: string;
  /** Evita que un doble clic le descuente dos veces al empleado. */
  idempotencyKey?: string;
}
