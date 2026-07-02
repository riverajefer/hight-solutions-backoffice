/**
 * Utilidades para convertir filtros de fecha (formato `YYYY-MM-DD`) en límites
 * de día completos.
 *
 * `new Date('2026-07-01')` se interpreta como medianoche UTC
 * (`2026-07-01T00:00:00.000Z`). Al usar ese valor tanto para `gte` como para
 * `lte`, cualquier orden creada durante ese día (p. ej. 18:34) queda excluida,
 * porque su timestamp es mayor que la medianoche. Por eso el límite superior
 * debe apuntar al final del día.
 */

/**
 * Inicio del día (00:00:00.000 UTC) para un filtro `desde`.
 * Devuelve `undefined` si no se provee fecha.
 */
export function startOfDay(date?: string): Date | undefined {
  if (!date) return undefined;
  return new Date(`${date}T00:00:00.000Z`);
}

/**
 * Fin del día (23:59:59.999 UTC) para un filtro `hasta`, de modo que el rango
 * sea inclusivo y filtrar el mismo día en `desde`/`hasta` devuelva sus órdenes.
 * Devuelve `undefined` si no se provee fecha.
 */
export function endOfDay(date?: string): Date | undefined {
  if (!date) return undefined;
  return new Date(`${date}T23:59:59.999Z`);
}
