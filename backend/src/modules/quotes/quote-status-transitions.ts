import { QuoteStatus } from '../../generated/prisma';

/**
 * Flujo secuencial estricto de estados de cotización:
 * DRAFT → SENT → FOLLOW_UP_1 → FOLLOW_UP_2 → FOLLOW_UP_3 → NO_RESPONSE
 *                                                        ↘ ACCEPTED → CONVERTED
 *                                                        ↘ REJECTED (requiere motivo)
 *
 * Los tres seguimientos son los contactos que se le hacen al cliente después de
 * enviarle la cotización, y se avanzan de uno en uno: no se puede saltar del
 * primero al tercero, porque el estado cuenta cuántas veces se le insistió.
 *
 * Desde «Enviada» y desde cualquier seguimiento el cliente puede aceptar,
 * rechazar o dejar de responder, así que esos tres destinos salen de todos.
 *
 * «Rechazada» es terminal en la máquina de estados: solo se deshace con
 * autorización de un administrador (módulo quote-restore-requests).
 */
export const ALLOWED_QUOTE_TRANSITIONS: Record<QuoteStatus, QuoteStatus[]> = {
  [QuoteStatus.DRAFT]:       [QuoteStatus.SENT],
  [QuoteStatus.SENT]:        [QuoteStatus.FOLLOW_UP_1, QuoteStatus.ACCEPTED, QuoteStatus.NO_RESPONSE, QuoteStatus.REJECTED],
  [QuoteStatus.FOLLOW_UP_1]: [QuoteStatus.FOLLOW_UP_2, QuoteStatus.ACCEPTED, QuoteStatus.NO_RESPONSE, QuoteStatus.REJECTED],
  [QuoteStatus.FOLLOW_UP_2]: [QuoteStatus.FOLLOW_UP_3, QuoteStatus.ACCEPTED, QuoteStatus.NO_RESPONSE, QuoteStatus.REJECTED],
  [QuoteStatus.FOLLOW_UP_3]: [QuoteStatus.ACCEPTED, QuoteStatus.NO_RESPONSE, QuoteStatus.REJECTED],
  [QuoteStatus.ACCEPTED]:    [QuoteStatus.CONVERTED, QuoteStatus.REJECTED],
  [QuoteStatus.NO_RESPONSE]: [QuoteStatus.REJECTED],
  [QuoteStatus.REJECTED]:    [],
  [QuoteStatus.CONVERTED]:   [],
};

export function isValidQuoteTransition(current: QuoteStatus, next: QuoteStatus): boolean {
  return ALLOWED_QUOTE_TRANSITIONS[current]?.includes(next) ?? false;
}

export function getValidNextQuoteStatuses(current: QuoteStatus): QuoteStatus[] {
  return ALLOWED_QUOTE_TRANSITIONS[current] || [];
}
