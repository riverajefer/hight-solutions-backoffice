/**
 * Utilidades para convertir filtros de fecha en límites de día completos.
 *
 * Los filtros pueden llegar en dos formatos:
 *  - Fecha simple `YYYY-MM-DD` (p. ej. desde un DatePicker sin hora).
 *  - Fecha-hora ISO completa `YYYY-MM-DDTHH:mm:ss.sssZ` (p. ej. cuando el
 *    frontend envía `date.toISOString()`).
 *
 * `new Date('2026-07-01')` se interpreta como medianoche UTC
 * (`2026-07-01T00:00:00.000Z`). Al usar ese valor tanto para `gte` como para
 * `lte`, cualquier orden creada durante ese día (p. ej. 18:34) queda excluida,
 * porque su timestamp es mayor que la medianoche. Por eso, cuando solo se
 * recibe la fecha, el límite superior debe apuntar al final del día.
 *
 * Cuando el valor ya incluye componente horario (una fecha-hora ISO), se usa
 * tal cual, ya que representa el instante exacto deseado.
 */

/** Verdadero si el string incluye componente horario (fecha-hora ISO). */
function hasTimeComponent(date: string): boolean {
  return date.includes('T');
}

/**
 * Inicio del día (00:00:00.000 UTC) para un filtro `desde`. Si el valor ya es
 * una fecha-hora ISO completa, se respeta el instante recibido.
 * Devuelve `undefined` si no se provee fecha o si el valor es inválido.
 */
export function startOfDay(date?: string): Date | undefined {
  if (!date) return undefined;
  const parsed = new Date(
    hasTimeComponent(date) ? date : `${date}T00:00:00.000Z`,
  );
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

/**
 * Fin del día (23:59:59.999 UTC) para un filtro `hasta`, de modo que el rango
 * sea inclusivo y filtrar el mismo día en `desde`/`hasta` devuelva sus órdenes.
 * Si el valor ya es una fecha-hora ISO completa, se respeta el instante recibido.
 * Devuelve `undefined` si no se provee fecha o si el valor es inválido.
 */
export function endOfDay(date?: string): Date | undefined {
  if (!date) return undefined;
  const parsed = new Date(
    hasTimeComponent(date) ? date : `${date}T23:59:59.999Z`,
  );
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}
