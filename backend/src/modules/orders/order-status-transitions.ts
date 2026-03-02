import { OrderStatus } from '../../generated/prisma';

/**
 * Flujo secuencial estricto de estados de orden:
 * DRAFT → CONFIRMED → IN_PRODUCTION → READY → PAID → DELIVERED | DELIVERED_ON_CREDIT → WARRANTY
 *
 * "Entregada a Crédito" es la excepción: se entrega sin pago completo.
 */
export const ALLOWED_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  [OrderStatus.DRAFT]: [OrderStatus.CONFIRMED],
  [OrderStatus.CONFIRMED]: [OrderStatus.IN_PRODUCTION],
  [OrderStatus.IN_PRODUCTION]: [OrderStatus.READY],
  [OrderStatus.READY]: [OrderStatus.PAID, OrderStatus.DELIVERED_ON_CREDIT],
  [OrderStatus.PAID]: [OrderStatus.DELIVERED],
  [OrderStatus.DELIVERED]: [OrderStatus.WARRANTY],
  [OrderStatus.DELIVERED_ON_CREDIT]: [OrderStatus.WARRANTY],
  [OrderStatus.WARRANTY]: [OrderStatus.DELIVERED],
};

export function getValidNextStatuses(currentStatus: OrderStatus): OrderStatus[] {
  return ALLOWED_TRANSITIONS[currentStatus] || [];
}

export function isValidTransition(currentStatus: OrderStatus, newStatus: OrderStatus): boolean {
  return ALLOWED_TRANSITIONS[currentStatus]?.includes(newStatus) ?? false;
}
