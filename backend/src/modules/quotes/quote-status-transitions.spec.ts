import { QuoteStatus } from '../../generated/prisma';
import {
  isValidQuoteTransition,
  getValidNextQuoteStatuses,
} from './quote-status-transitions';

describe('quote-status-transitions', () => {
  describe('cadena de seguimientos', () => {
    it.each([
      [QuoteStatus.SENT, QuoteStatus.FOLLOW_UP_1],
      [QuoteStatus.FOLLOW_UP_1, QuoteStatus.FOLLOW_UP_2],
      [QuoteStatus.FOLLOW_UP_2, QuoteStatus.FOLLOW_UP_3],
    ])('permite avanzar de %s a %s', (from, to) => {
      expect(isValidQuoteTransition(from, to)).toBe(true);
    });

    it.each([
      [QuoteStatus.SENT, QuoteStatus.FOLLOW_UP_2],
      [QuoteStatus.SENT, QuoteStatus.FOLLOW_UP_3],
      [QuoteStatus.FOLLOW_UP_1, QuoteStatus.FOLLOW_UP_3],
    ])('no permite saltarse seguimientos: %s a %s', (from, to) => {
      expect(isValidQuoteTransition(from, to)).toBe(false);
    });

    it.each([
      [QuoteStatus.FOLLOW_UP_2, QuoteStatus.FOLLOW_UP_1],
      [QuoteStatus.FOLLOW_UP_3, QuoteStatus.FOLLOW_UP_2],
      [QuoteStatus.FOLLOW_UP_1, QuoteStatus.SENT],
    ])('no permite devolverse: %s a %s', (from, to) => {
      expect(isValidQuoteTransition(from, to)).toBe(false);
    });
  });

  describe('salidas del flujo comercial', () => {
    it.each([
      QuoteStatus.SENT,
      QuoteStatus.FOLLOW_UP_1,
      QuoteStatus.FOLLOW_UP_2,
      QuoteStatus.FOLLOW_UP_3,
    ])('desde %s se puede aceptar, rechazar o marcar sin respuesta', (from) => {
      const next = getValidNextQuoteStatuses(from);
      expect(next).toEqual(
        expect.arrayContaining([
          QuoteStatus.ACCEPTED,
          QuoteStatus.NO_RESPONSE,
          QuoteStatus.REJECTED,
        ]),
      );
    });

    it('el tercer seguimiento ya no avanza a otro seguimiento', () => {
      expect(getValidNextQuoteStatuses(QuoteStatus.FOLLOW_UP_3)).not.toContain(
        QuoteStatus.FOLLOW_UP_1,
      );
      expect(getValidNextQuoteStatuses(QuoteStatus.FOLLOW_UP_3)).toHaveLength(3);
    });

    it('un borrador solo puede enviarse', () => {
      expect(getValidNextQuoteStatuses(QuoteStatus.DRAFT)).toEqual([
        QuoteStatus.SENT,
      ]);
    });

    it('rechazada y convertida son terminales', () => {
      expect(getValidNextQuoteStatuses(QuoteStatus.REJECTED)).toEqual([]);
      expect(getValidNextQuoteStatuses(QuoteStatus.CONVERTED)).toEqual([]);
    });
  });
});
