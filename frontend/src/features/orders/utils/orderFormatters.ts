// Formatters compartidos para el módulo de Órdenes de Pedido.
// Se usan tanto en el listado (OrdersListPage) como en la exportación a Excel
// para mantener una sola fuente de verdad de formatos de moneda/fechas.

/** Formatea un valor decimal (string del backend) como moneda COP sin decimales. */
export const formatCurrency = (value: string | number): string => {
  const numValue = typeof value === 'number' ? value : parseFloat(value);
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Number.isFinite(numValue) ? numValue : 0);
};

/** Formatea una fecha ISO como fecha corta es-CO (sin hora). */
export const formatDate = (date: string): string => {
  return new Intl.DateTimeFormat('es-CO').format(new Date(date));
};

/** Formatea una fecha ISO como fecha + hora es-CO. */
export const formatDateTime = (date: string): string => {
  return new Intl.DateTimeFormat('es-CO', {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date));
};

/** Días transcurridos (>= 0) desde una fecha hasta hoy, a nivel de día. */
export const getDaysSince = (date: string): number => {
  const created = new Date(date);
  created.setHours(0, 0, 0, 0);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const diffMs = today.getTime() - created.getTime();
  return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
};
