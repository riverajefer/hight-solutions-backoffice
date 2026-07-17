// Definición de columnas exportables a Excel para Rentabilidad por Orden.
// Fuente única para el modal de exportación: cada columna sabe cómo obtener su
// valor desde un OrderProfitabilityListItem y si es numérica (fila de totales).

import type { OrderProfitabilityListItem } from '../../../types/order.types';
import { ORDER_STATUS_CONFIG, type OrderStatus } from '../../../types/order.types';
import type { ExportColumn } from '../../../utils/excelExport';
import { formatDate } from './orderFormatters';

export type ProfitabilityExportColumn = ExportColumn<OrderProfitabilityListItem>;

const num = (value: number | null | undefined): number =>
  typeof value === 'number' && Number.isFinite(value) ? value : 0;

export const PROFITABILITY_EXPORT_COLUMNS: ProfitabilityExportColumn[] = [
  // ── Visibles por defecto (espejo de la tabla) ──────────────────────
  {
    key: 'orderNumber',
    label: 'Nº Orden',
    defaultVisible: true,
    getValue: (r) => r.orderNumber,
  },
  {
    key: 'clientName',
    label: 'Cliente',
    defaultVisible: true,
    getValue: (r) => r.clientName,
  },
  {
    key: 'orderTotal',
    label: 'Total OP',
    defaultVisible: true,
    numeric: true,
    getValue: (r) => num(r.orderTotal),
  },
  {
    key: 'totalExpenses',
    label: 'Total Gastos',
    defaultVisible: true,
    numeric: true,
    getValue: (r) => num(r.totalExpenses),
  },
  {
    key: 'utility',
    label: 'Utilidad',
    defaultVisible: true,
    numeric: true,
    getValue: (r) => num(r.utility),
  },
  {
    // No se suma: un promedio de porcentajes no es significativo como total.
    key: 'utilityPercentage',
    label: 'Margen %',
    defaultVisible: true,
    getValue: (r) => `${num(r.utilityPercentage).toFixed(2)}%`,
  },
  {
    key: 'status',
    label: 'Estado',
    defaultVisible: true,
    getValue: (r) =>
      ORDER_STATUS_CONFIG[r.status as OrderStatus]?.label ?? r.status,
  },
  {
    key: 'orderDate',
    label: 'Fecha',
    defaultVisible: true,
    getValue: (r) => (r.orderDate ? formatDate(r.orderDate) : ''),
  },
];
