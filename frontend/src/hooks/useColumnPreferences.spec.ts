import { describe, expect, it } from 'vitest';
import type { GridColDef } from '@mui/x-data-grid';
import { applyColumnPreferences, mergeOrder } from './useColumnPreferences';

const cols = (...fields: string[]): GridColDef[] =>
  fields.map((field) => ({ field, headerName: field }));

const fieldsOf = (columns: GridColDef[]) => columns.map((c) => c.field);

const LOCKED = ['orderNumber', 'actions'];
const BASE = cols('orderNumber', 'status', 'client', 'total', 'actions');

describe('applyColumnPreferences', () => {
  it('deja las columnas como están cuando no hay preferencias', () => {
    const result = applyColumnPreferences(BASE, { order: [], hidden: [] }, LOCKED);
    expect(fieldsOf(result)).toEqual(['orderNumber', 'status', 'client', 'total', 'actions']);
  });

  it('reordena solo las columnas movibles', () => {
    const result = applyColumnPreferences(
      BASE,
      { order: ['total', 'client', 'status'], hidden: [] },
      LOCKED,
    );
    expect(fieldsOf(result)).toEqual(['orderNumber', 'total', 'client', 'status', 'actions']);
  });

  it('mantiene la columna fija al inicio y las acciones al final', () => {
    const result = applyColumnPreferences(
      BASE,
      { order: ['total', 'status', 'client'], hidden: [] },
      LOCKED,
    );
    expect(result[0].field).toBe('orderNumber');
    expect(result[result.length - 1].field).toBe('actions');
  });

  it('quita las columnas ocultas sin afectar a las bloqueadas', () => {
    const result = applyColumnPreferences(
      BASE,
      { order: [], hidden: ['client', 'orderNumber', 'actions'] },
      LOCKED,
    );
    expect(fieldsOf(result)).toEqual(['orderNumber', 'status', 'total', 'actions']);
  });

  it('ubica al final las columnas nuevas del código que no estaban guardadas', () => {
    const base = cols('orderNumber', 'status', 'client', 'nuevaColumna', 'actions');
    const result = applyColumnPreferences(
      base,
      { order: ['client', 'status'], hidden: [] },
      LOCKED,
    );
    expect(fieldsOf(result)).toEqual([
      'orderNumber',
      'client',
      'status',
      'nuevaColumna',
      'actions',
    ]);
  });

  it('ignora campos guardados que ya no existen en el código', () => {
    const result = applyColumnPreferences(
      BASE,
      { order: ['columnaBorrada', 'total', 'status', 'client'], hidden: ['otraBorrada'] },
      LOCKED,
    );
    expect(fieldsOf(result)).toEqual(['orderNumber', 'total', 'status', 'client', 'actions']);
  });
});

describe('mergeOrder', () => {
  it('usa el orden nuevo cuando no había nada guardado', () => {
    expect(mergeOrder([], ['b', 'a'])).toEqual(['b', 'a']);
  });

  it('conserva la posición de los campos que no estaban visibles', () => {
    // En móvil solo se ven `status` y `total`; `client` y `notes` no se tocan.
    const previous = ['status', 'client', 'total', 'notes'];
    const result = mergeOrder(previous, ['total', 'status']);

    // Las ranuras 0 y 2 (las que ocupaban status y total) se reasignan en el
    // nuevo orden; client y notes siguen en 1 y 3.
    expect(result).toEqual(['total', 'client', 'status', 'notes']);
  });

  it('no pierde ningún campo al combinar', () => {
    const previous = ['a', 'b', 'c', 'd'];
    const result = mergeOrder(previous, ['d', 'a']);
    expect([...result].sort()).toEqual(['a', 'b', 'c', 'd']);
  });

  it('agrega campos que aún no estaban guardados', () => {
    const result = mergeOrder(['a', 'b'], ['nuevo', 'a']);
    expect(result).toContain('nuevo');
    expect(result).toHaveLength(3);
  });
});
