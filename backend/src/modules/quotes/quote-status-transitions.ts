import { QuoteStatus } from '../../generated/prisma';

/**
 * Flujo secuencial estricto de estados de cotización:
 * DRAFT → SENT → ACCEPTED → CONVERTED
 *               ↘ NO_RESPONSE (terminal)
 */
export const ALLOWED_QUOTE_TRANSITIONS: Record<QuoteStatus, QuoteStatus[]> = {
  [QuoteStatus.DRAFT]:       [QuoteStatus.SENT],
  [QuoteStatus.SENT]:        [QuoteStatus.ACCEPTED, QuoteStatus.NO_RESPONSE],
  [QuoteStatus.ACCEPTED]:    [QuoteStatus.CONVERTED],
  [QuoteStatus.NO_RESPONSE]: [],
  [QuoteStatus.CONVERTED]:   [],
};

export function isValidQuoteTransition(current: QuoteStatus, next: QuoteStatus): boolean {
  return ALLOWED_QUOTE_TRANSITIONS[current]?.includes(next) ?? false;
}

export function getValidNextQuoteStatuses(current: QuoteStatus): QuoteStatus[] {
  return ALLOWED_QUOTE_TRANSITIONS[current] || [];
}
