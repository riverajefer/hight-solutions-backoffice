import { QuoteStatus } from '../../generated/prisma';

/**
 * Flujo secuencial estricto de estados de cotización:
 * DRAFT → SENT → ACCEPTED → CONVERTED
 *               ↘ NO_RESPONSE → REJECTED
 *               ↘ REJECTED (terminal, requiere motivo)
 *
 * El rechazo es alcanzable desde Enviada, Aceptada y Sin respuesta: el cliente
 * puede echarse atrás después de aceptar, o responder que no tras el silencio.
 */
export const ALLOWED_QUOTE_TRANSITIONS: Record<QuoteStatus, QuoteStatus[]> = {
  [QuoteStatus.DRAFT]:       [QuoteStatus.SENT],
  [QuoteStatus.SENT]:        [QuoteStatus.ACCEPTED, QuoteStatus.NO_RESPONSE, QuoteStatus.REJECTED],
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
