/**
 * Topes de paginación.
 *
 * Los filtros declaraban `limit` con `@Min(1)` y sin techo, y los repositorios
 * se lo pasaban tal cual a Prisma (`take: limit`). `GET /orders?limit=100000`
 * traía la tabla completa con todos sus `include`. No es un agujero de
 * seguridad —hace falta estar autenticado y con permiso de lectura— pero sí una
 * forma fácil de tumbar la API sin querer, y el backend no aguanta réplicas que
 * lo amortigüen.
 */

/**
 * Tope normal de una página. Ninguna tabla del frontend ofrece más de 100 filas
 * por página, así que este techo no le quita nada a la interfaz.
 */
export const MAX_PAGE_SIZE = 100;

/**
 * Tope de los listados que además alimentan reportes que traen varias páginas
 * de golpe. Hoy solo órdenes: dos pantallas piden 500 y 1.000 filas para
 * filtrar del lado del cliente (ver el hallazgo 13 de la cuarta barrida). Es un
 * techo alto a propósito, para acotar el daño sin romper lo que ya funciona;
 * cuando esas dos pantallas dejen de traerse la tabla entera, baja a
 * `MAX_PAGE_SIZE`.
 */
export const MAX_REPORT_PAGE_SIZE = 1000;

/**
 * Tope de los movimientos de caja, que se listan de a más por página.
 */
export const MAX_CASH_PAGE_SIZE = 200;

/**
 * Tope de la exportación a Excel de Cuentas por Pagar, que se trae el rango
 * completo sin paginar. No es un tamaño de página: es "todo", acotado a un
 * número con nombre para que el camino no quede literalmente sin techo.
 */
export const MAX_EXPORT_PAGE_SIZE = 100000;

/**
 * Segunda línea de defensa, en el repositorio.
 *
 * La validación del DTO ya rechaza los límites excesivos, pero un repositorio
 * puede llamarse desde un servicio que arme el filtro a mano, sin pasar por el
 * `ValidationPipe`. Este clamp evita que ese camino se lleve la tabla entera.
 */
export function clampPageSize(
  limit: number | undefined,
  fallback = 20,
  max: number = MAX_PAGE_SIZE,
): number {
  const value = Number(limit);
  if (!Number.isFinite(value) || value < 1) return Math.min(fallback, max);
  return Math.min(Math.floor(value), max);
}
