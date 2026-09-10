import { describe, it, expect } from 'vitest';
import { mutationTargetId, isRowPending, isAnyRowPending } from './mutationState';

describe('mutationTargetId', () => {
  it('devuelve el valor cuando las variables son el id suelto', () => {
    expect(mutationTargetId('abc-123')).toBe('abc-123');
    expect(mutationTargetId(42)).toBe(42);
  });

  it('saca el id de un objeto { id, dto }', () => {
    expect(mutationTargetId({ id: 'abc-123', dto: { periodId: 'p1' } })).toBe('abc-123');
  });

  it('devuelve undefined si no hay de dónde sacarlo', () => {
    expect(mutationTargetId(undefined)).toBeUndefined();
    expect(mutationTargetId(null)).toBeUndefined();
    expect(mutationTargetId({ requestId: 'abc-123' })).toBeUndefined();
  });
});

describe('isRowPending', () => {
  it('es true solo para la fila que está en vuelo', () => {
    const mutation = { isPending: true, variables: 'row-1' };

    expect(isRowPending(mutation, 'row-1')).toBe(true);
    expect(isRowPending(mutation, 'row-2')).toBe(false);
  });

  it('funciona con variables de la forma { id, dto }', () => {
    const mutation = { isPending: true, variables: { id: 'row-1', dto: {} } };

    expect(isRowPending(mutation, 'row-1')).toBe(true);
  });

  it('es false cuando la mutación no está corriendo', () => {
    // React Query deja `variables` poblado después de resolver: sin la guarda
    // de isPending el botón se quedaría girando para siempre.
    expect(isRowPending({ isPending: false, variables: 'row-1' }, 'row-1')).toBe(false);
  });

  it('es false si no hay variables todavía', () => {
    expect(isRowPending({ isPending: true, variables: undefined }, 'row-1')).toBe(false);
  });

  it('acepta un extractor propio para formas raras', () => {
    const mutation = { isPending: true, variables: { requestId: 'row-1' } };

    expect(isRowPending(mutation, 'row-1', (v) => v.requestId)).toBe(true);
    expect(isRowPending(mutation, 'row-2', (v) => v.requestId)).toBe(false);
  });
});

describe('isAnyRowPending', () => {
  it('es true si cualquiera de las mutaciones corre para esa fila', () => {
    const idle = { isPending: false, variables: undefined };
    const busy = { isPending: true, variables: { id: 'row-1' } };

    expect(isAnyRowPending([idle, busy], 'row-1')).toBe(true);
    expect(isAnyRowPending([idle, busy], 'row-2')).toBe(false);
    expect(isAnyRowPending([idle, idle], 'row-1')).toBe(false);
  });
});
