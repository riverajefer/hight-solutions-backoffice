import { useCallback, useMemo, useState } from 'react';
import type { GridColDef, GridValidRowModel } from '@mui/x-data-grid';
import { useAuthStore } from '../store/authStore';

export interface ColumnPreferences {
  /** Orden elegido por el usuario, por `field`. Puede estar incompleto o traer campos viejos. */
  order: string[];
  /** Campos ocultados por el usuario. */
  hidden: string[];
}

const EMPTY: ColumnPreferences = { order: [], hidden: [] };

const storageKeyFor = (key: string, userId?: string) =>
  `datatable-cols:${userId ?? 'anon'}:${key}`;

const read = (storageKey: string): ColumnPreferences => {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw);
    return {
      order: Array.isArray(parsed?.order) ? parsed.order.filter((f: unknown) => typeof f === 'string') : [],
      hidden: Array.isArray(parsed?.hidden) ? parsed.hidden.filter((f: unknown) => typeof f === 'string') : [],
    };
  } catch {
    // localStorage lleno, JSON corrupto o modo privado: se ignora la preferencia
    return EMPTY;
  }
};

const write = (storageKey: string, prefs: ColumnPreferences) => {
  try {
    localStorage.setItem(storageKey, JSON.stringify(prefs));
  } catch {
    // Sin persistencia; la sesión actual sigue funcionando igual
  }
};

/**
 * Combina un orden parcial con el ya guardado.
 *
 * En pantallas chicas `useResponsiveColumns` recorta columnas, así que el
 * diálogo solo ve una parte. Si guardáramos esa lista tal cual, las columnas de
 * escritorio perderían su posición. Acá los campos reordenados se reinsertan en
 * las ranuras que ya ocupaban, dejando intactos los que no estaban a la vista.
 */
export function mergeOrder(previous: string[], partial: string[]): string[] {
  const missing = partial.filter((field) => !previous.includes(field));
  const full = [...previous, ...missing];

  const slots = full
    .map((field, index) => ({ field, index }))
    .filter((entry) => partial.includes(entry.field))
    .map((entry) => entry.index);

  const result = [...full];
  partial.forEach((field, i) => {
    result[slots[i]] = field;
  });

  return result;
}

/**
 * Aplica orden y visibilidad a las columnas base.
 *
 * Las columnas bloqueadas (fija a la izquierda, acciones) se sacan de la
 * reordenación y se reinsertan en su posición original, de modo que el usuario
 * nunca pueda romper el `position: sticky` ni dejar las acciones en medio.
 */
export function applyColumnPreferences<R extends GridValidRowModel>(
  base: GridColDef<R>[],
  prefs: ColumnPreferences,
  locked: string[],
): GridColDef<R>[] {
  const isLocked = (field: string) => locked.includes(field);

  const lockedEntries = base
    .map((column, index) => ({ column, index }))
    .filter((entry) => isLocked(entry.column.field));

  const movable = base.filter((column) => !isLocked(column.field));

  // Los campos sin posición guardada (columnas nuevas del código) conservan su
  // orden original quedando al final del bloque ya ordenado.
  const positionOf = (field: string) => {
    const stored = prefs.order.indexOf(field);
    return stored === -1 ? Number.MAX_SAFE_INTEGER : stored;
  };

  const sorted = movable
    .map((column, index) => ({ column, index }))
    .sort((a, b) => {
      const diff = positionOf(a.column.field) - positionOf(b.column.field);
      return diff !== 0 ? diff : a.index - b.index;
    })
    .map((entry) => entry.column);

  const visible = sorted.filter((column) => !prefs.hidden.includes(column.field));

  const result = [...visible];
  lockedEntries.forEach(({ column, index }) => {
    result.splice(Math.min(index, result.length), 0, column);
  });

  return result;
}

/**
 * Orden y visibilidad de columnas persistidos en localStorage, por usuario y tabla.
 *
 * @param key    identificador de la tabla (p. ej. `'orders'`)
 * @param base   columnas tal como las define la página
 * @param locked campos que no se pueden mover ni ocultar
 */
export function useColumnPreferences<R extends GridValidRowModel>(
  key: string,
  base: GridColDef<R>[],
  locked: string[] = [],
) {
  const userId = useAuthStore((state) => state.user?.id);
  const storageKey = useMemo(() => storageKeyFor(key, userId), [key, userId]);

  const [prefs, setPrefs] = useState<ColumnPreferences>(() => read(storageKey));

  const persist = useCallback(
    (next: ColumnPreferences) => {
      setPrefs(next);
      write(storageKey, next);
    },
    [storageKey],
  );

  const columns = useMemo(
    () => applyColumnPreferences(base, prefs, locked),
    // `locked` suele venir como literal en el JSX; se compara por contenido
    // para no recalcular en cada render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [base, prefs, locked.join('|')],
  );

  /** Campos movibles en el orden actual, para alimentar el diálogo. */
  const orderedFields = useMemo(
    () =>
      applyColumnPreferences(base, { ...prefs, hidden: [] }, locked)
        .filter((column) => !locked.includes(column.field))
        .map((column) => column.field),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [base, prefs, locked.join('|')],
  );

  const setOrder = useCallback(
    (order: string[]) => persist({ ...prefs, order: mergeOrder(prefs.order, order) }),
    [persist, prefs],
  );

  const toggleVisibility = useCallback(
    (field: string) => {
      const hidden = prefs.hidden.includes(field)
        ? prefs.hidden.filter((f) => f !== field)
        : [...prefs.hidden, field];
      persist({ ...prefs, hidden });
    },
    [persist, prefs],
  );

  const reset = useCallback(() => {
    setPrefs(EMPTY);
    try {
      localStorage.removeItem(storageKey);
    } catch {
      // sin persistencia
    }
  }, [storageKey]);

  return {
    /** Columnas listas para el DataGrid (ordenadas y sin las ocultas). */
    columns,
    orderedFields,
    hiddenFields: prefs.hidden,
    isCustomized: prefs.order.length > 0 || prefs.hidden.length > 0,
    setOrder,
    toggleVisibility,
    reset,
  };
}
