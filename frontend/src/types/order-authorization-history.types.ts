/**
 * Tipos del historial unificado de aprobaciones y solicitudes de autorización
 * de una OP (anticipos, descuentos, propiedad de cliente, edición y anulación
 * de pagos, y solicitudes de edición general).
 */

export type OrderAuthEventType =
  | 'ADVANCE_PAYMENT'
  | 'DISCOUNT'
  | 'CLIENT_OWNERSHIP'
  | 'PAYMENT_EDIT'
  | 'PAYMENT_VOID'
  | 'EDIT_REQUEST';

export type OrderAuthEventStatus =
  | 'PENDING'
  | 'APPROVED'
  | 'REJECTED'
  | 'EXPIRED';

interface AuthHistoryUser {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
}

export interface OrderAuthHistoryEvent {
  id: string;
  type: OrderAuthEventType;
  status: OrderAuthEventStatus;
  reason: string | null;
  /** Monto asociado (anticipo, descuento, edición de pago); null si no aplica. */
  amount: string | null;
  /** Asesor destino (solo propiedad de cliente); null si no aplica. */
  advisor: AuthHistoryUser | null;
  createdAt: string;
  reviewedAt: string | null;
  reviewNotes: string | null;
  requestedBy: AuthHistoryUser;
  reviewedBy: AuthHistoryUser | null;
  /**
   * El evento se ejecutó sin pasar por aprobación (solo `PAYMENT_VOID`): Caja o
   * Contabilidad anulando con la caja abierta. Cambia cómo se lee la línea de
   * revisión: nadie aprobó nada, alguien lo hizo.
   */
  direct?: boolean;
}
