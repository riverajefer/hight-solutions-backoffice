import type { Order } from '../../../types/order.types';

export interface PendingAdvanceInfo {
  /** Hay al menos un abono registrado pero aún no aprobado por Caja */
  hasPendingAdvance: boolean;
  /** Monto total de los abonos pendientes de aprobación */
  pendingAmount: number;
  /** IDs de los pagos que están pendientes de aprobación */
  pendingPaymentIds: string[];
  /** Abono realmente aplicado (aprobado por Caja) */
  appliedPaidAmount: number;
  /** Saldo a cobrar sin descontar los abonos pendientes */
  effectiveBalance: number;
}

/**
 * Los abonos registrados al crear la orden quedan pendientes de aprobación por
 * Caja, pero el backend ya los suma a `paidAmount` (y los descuenta de
 * `balance`) desde el momento del registro. Para efectos de presentación no
 * deben considerarse aplicados hasta que Caja los apruebe.
 */
export const getPendingAdvanceInfo = (order: Order): PendingAdvanceInfo => {
  const total = parseFloat(order.total || '0');
  const paidAmount = parseFloat(order.paidAmount || '0');

  const pendingPaymentIds = (order.advancePaymentApprovals || [])
    .filter((approval) => approval.status === 'PENDING' && approval.paymentId)
    .map((approval) => approval.paymentId as string);

  let pendingAmount = (order.payments || [])
    .filter((payment) => pendingPaymentIds.includes(payment.id))
    .reduce((sum, payment) => sum + parseFloat(payment.amount || '0'), 0);

  // Respaldo: la orden está marcada como pendiente pero no se pudo asociar el
  // pago (p. ej. la solicitud no vino en la respuesta).
  if (pendingAmount === 0 && order.advancePaymentStatus === 'PENDING') {
    pendingAmount = paidAmount;
  }

  // Nunca puede haber más pendiente que lo abonado.
  pendingAmount = Math.min(Math.max(pendingAmount, 0), Math.max(paidAmount, 0));

  const appliedPaidAmount = paidAmount - pendingAmount;

  return {
    hasPendingAdvance: pendingAmount > 0,
    pendingAmount,
    pendingPaymentIds,
    appliedPaidAmount,
    effectiveBalance: total - appliedPaidAmount,
  };
};
