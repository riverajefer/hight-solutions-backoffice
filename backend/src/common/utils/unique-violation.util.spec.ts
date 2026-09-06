import { isUniqueViolationOn } from './unique-violation.util';

/**
 * La forma del error es la que produce el adaptador `PrismaPg`, no la del motor
 * nativo. Es justo la diferencia que hacía pasar los tests y fallar producción:
 * los mocks escritos a mano usaban `meta.target`, que con este adaptador viene
 * vacío.
 */
const adapterP2002 = (constraint: string, fields: string[]) => ({
  code: 'P2002',
  meta: {
    driverAdapterError: {
      cause: {
        constraint: { fields },
        originalMessage: `duplicate key value violates unique constraint "${constraint}"`,
      },
    },
  },
});

describe('isUniqueViolationOn', () => {
  it('should detect the constraint by name when meta.target is empty', () => {
    const error = adapterP2002('refund_requests_pending_unique', ['order_id']);

    expect(error.meta).not.toHaveProperty('target');
    expect(isUniqueViolationOn(error, 'refund_requests_pending_unique')).toBe(
      true,
    );
  });

  it('should detect it by column name too', () => {
    const error = adapterP2002('expense_orders_idempotency_key_key', [
      'idempotency_key',
    ]);

    expect(isUniqueViolationOn(error, 'idempotency_key')).toBe(true);
  });

  it('should not match a different unique constraint on the same table', () => {
    const error = adapterP2002('refund_requests_cash_movement_id_key', [
      'cash_movement_id',
    ]);

    expect(isUniqueViolationOn(error, 'refund_requests_pending_unique')).toBe(
      false,
    );
  });

  it('should ignore errors that are not P2002', () => {
    const error = { code: 'P2025', meta: { cause: 'Record to update not found' } };

    expect(isUniqueViolationOn(error, 'refund_requests_pending_unique')).toBe(
      false,
    );
  });

  it('should still work with the native engine shape (meta.target)', () => {
    const error = {
      code: 'P2002',
      meta: { target: ['refund_requests_pending_unique'] },
    };

    expect(isUniqueViolationOn(error, 'refund_requests_pending_unique')).toBe(
      true,
    );
  });

  it('should not blow up on errors without meta', () => {
    expect(isUniqueViolationOn({ code: 'P2002' }, 'whatever')).toBe(false);
    expect(isUniqueViolationOn(null, 'whatever')).toBe(false);
    expect(isUniqueViolationOn(undefined, 'whatever')).toBe(false);
    expect(isUniqueViolationOn(new Error('boom'), 'whatever')).toBe(false);
  });
});
