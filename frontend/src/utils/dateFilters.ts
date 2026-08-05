/**
 * Helpers para los filtros de fecha que viajan al backend.
 *
 * Todos los filtros por "día" (fecha de orden, fecha de creación, vencimiento…)
 * se envían como fecha simple `YYYY-MM-DD`: es el día que el usuario eligió en
 * el calendario, sin hora. El backend lo expande al día completo en hora
 * Colombia (ver `date-range.util.ts`).
 *
 * NO usar `date.toISOString().split('T')[0]` para esto: `toISOString()` convierte
 * a UTC primero, así que una fecha elegida como 01/07 puede terminar enviándose
 * como 30/06 (o 01/07 con hora), y entonces la pantalla, la tarjeta de totales y
 * el Excel exportado dejan de contar el mismo conjunto de registros.
 */

/** Formatea una fecha como `YYYY-MM-DD` usando el calendario local del usuario. */
export const toDateFilter = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/** Igual que `toDateFilter`, pero tolera `null`/`undefined` (DatePicker vacío). */
export const toDateFilterOrUndefined = (
  date: Date | null | undefined,
): string | undefined => (date ? toDateFilter(date) : undefined);

/**
 * Convierte un filtro `YYYY-MM-DD` de vuelta a `Date` en el calendario local,
 * para repoblar un DatePicker.
 *
 * NO usar `new Date('2026-07-01')`: eso es medianoche **UTC**, que en Colombia
 * es el 30 de junio a las 7:00 p. m., y el calendario muestra el día anterior al
 * que el usuario había elegido.
 */
export const parseDateFilter = (
  value: string | null | undefined,
): Date | undefined => {
  if (!value) return undefined;
  const [datePart] = value.split('T');
  const [year, month, day] = datePart.split('-').map(Number);
  if (!year || !month || !day) return undefined;
  return new Date(year, month - 1, day);
};
