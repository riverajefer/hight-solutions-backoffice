// Definición de columnas exportables a Excel para Cotizaciones.
// Fuente única para el modal de exportación: cada columna sabe cómo obtener su
// valor desde una Quote y si es numérica (para la fila de totales).

import type { Quote } from '../../../types/quote.types';
import { QUOTE_STATUS_CONFIG } from '../../../types/quote.types';
import type { ExportColumn } from '../../../utils/excelExport';

export type QuoteExportColumn = ExportColumn<Quote>;

const num = (value: number | string | null | undefined): number => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  const n = parseFloat(value ?? '');
  return Number.isFinite(n) ? n : 0;
};

const formatDate = (value?: string | null): string =>
  value ? new Date(value).toLocaleDateString('es-CO') : '';

export const QUOTE_EXPORT_COLUMNS: QuoteExportColumn[] = [
  // ── Visibles por defecto (espejo de la tabla) ──────────────────────
  {
    key: 'quoteNumber',
    label: 'Nº Cotización',
    defaultVisible: true,
    getValue: (q) => q.quoteNumber,
  },
  {
    key: 'client',
    label: 'Cliente',
    defaultVisible: true,
    getValue: (q) => q.client?.name ?? '',
  },
  {
    key: 'advisor',
    label: 'Asesor',
    defaultVisible: true,
    getValue: (q) =>
      `${q.createdBy?.firstName ?? ''} ${q.createdBy?.lastName ?? ''}`.trim(),
  },
  {
    key: 'quoteDate',
    label: 'Fecha',
    defaultVisible: true,
    getValue: (q) => formatDate(q.quoteDate),
  },
  {
    key: 'validUntil',
    label: 'Vence',
    defaultVisible: true,
    getValue: (q) => formatDate(q.validUntil),
  },
  {
    key: 'total',
    label: 'Total',
    defaultVisible: true,
    numeric: true,
    getValue: (q) => num(q.total),
  },
  {
    key: 'status',
    label: 'Estado',
    defaultVisible: true,
    getValue: (q) => QUOTE_STATUS_CONFIG[q.status]?.label ?? q.status,
  },
  // ── Extra (desmarcadas por defecto) ────────────────────────────────
  {
    key: 'subtotal',
    label: 'Subtotal',
    defaultVisible: false,
    numeric: true,
    getValue: (q) => num(q.subtotal),
  },
  {
    key: 'tax',
    label: 'IVA (monto)',
    defaultVisible: false,
    numeric: true,
    getValue: (q) => num(q.tax),
  },
  {
    key: 'taxRate',
    label: 'IVA',
    defaultVisible: false,
    getValue: (q) => (num(q.taxRate) > 0 ? 'SÍ' : 'NO'),
  },
  {
    key: 'itemsCount',
    label: 'Nº Ítems',
    defaultVisible: false,
    numeric: true,
    getValue: (q) => q.items?.length ?? 0,
  },
  {
    key: 'commercialChannel',
    label: 'Canal comercial',
    defaultVisible: false,
    getValue: (q) => q.commercialChannel?.name ?? '',
  },
  {
    key: 'orderNumber',
    label: 'Orden generada',
    defaultVisible: false,
    getValue: (q) => q.order?.orderNumber ?? '',
  },
  {
    key: 'createdAt',
    label: 'Creada',
    defaultVisible: false,
    getValue: (q) => formatDate(q.createdAt),
  },
  {
    key: 'notes',
    label: 'Notas',
    defaultVisible: false,
    getValue: (q) => q.notes ?? '',
  },
];
