// Definición de columnas exportables a Excel para registros DTF.
// Fuente única para el modal de exportación: cada columna sabe cómo obtener su
// valor desde un DtfRecord y si es numérica (para la fila de totales).

import type { DtfRecord } from '../../../types/dtf.types';
import {
  DTF_PAYMENT_METHOD_LABELS,
  DTF_STATUS_LABELS,
} from '../../../types/dtf.types';
import type { ExportColumn } from '../../../utils/excelExport';

export type DtfExportColumn = ExportColumn<DtfRecord>;

const num = (value: number | null | undefined): number =>
  typeof value === 'number' && Number.isFinite(value) ? value : 0;

const formatDate = (value?: string | null): string =>
  value ? new Date(value).toLocaleDateString('es-CO') : '';

export const DTF_EXPORT_COLUMNS: DtfExportColumn[] = [
  // ── Visibles por defecto (espejo de la tabla) ──────────────────────
  {
    key: 'consecutive',
    label: 'Consecutivo',
    defaultVisible: true,
    getValue: (r) => r.consecutive,
  },
  {
    key: 'product',
    label: 'Producto',
    defaultVisible: true,
    getValue: (r) => r.product?.name ?? '',
  },
  {
    key: 'client',
    label: 'Cliente',
    defaultVisible: true,
    getValue: (r) => r.client?.name ?? '',
  },
  {
    key: 'quantity',
    label: 'Cantidad',
    defaultVisible: true,
    numeric: true,
    getValue: (r) => num(r.quantity),
  },
  {
    key: 'value',
    label: 'Valor',
    defaultVisible: true,
    numeric: true,
    getValue: (r) => num(r.value),
  },
  {
    key: 'status',
    label: 'Estado',
    defaultVisible: true,
    getValue: (r) => DTF_STATUS_LABELS[r.status] ?? r.status,
  },
  {
    key: 'createdAt',
    label: 'Fecha',
    defaultVisible: true,
    getValue: (r) => formatDate(r.createdAt),
  },
  // ── Extra (desmarcadas por defecto) ────────────────────────────────
  {
    key: 'unitPrice',
    label: 'Precio Unitario',
    defaultVisible: false,
    numeric: true,
    getValue: (r) => num(r.unitPrice),
  },
  {
    key: 'abono',
    label: 'Abono',
    defaultVisible: false,
    numeric: true,
    getValue: (r) => num(r.abono),
  },
  {
    key: 'abonoPaymentMethod',
    label: 'Método de abono',
    defaultVisible: false,
    getValue: (r) =>
      r.abonoPaymentMethod
        ? (DTF_PAYMENT_METHOD_LABELS[r.abonoPaymentMethod] ??
          r.abonoPaymentMethod)
        : '',
  },
  {
    key: 'clientPhone',
    label: 'Teléfono Cliente',
    defaultVisible: false,
    getValue: (r) => r.client?.phone ?? '',
  },
  {
    key: 'clientNit',
    label: 'NIT Cliente',
    defaultVisible: false,
    getValue: (r) => r.client?.nit ?? '',
  },
  {
    key: 'orderNumber',
    label: 'Orden generada',
    defaultVisible: false,
    getValue: (r) => r.order?.orderNumber ?? '',
  },
  {
    key: 'createdBy',
    label: 'Creado por',
    defaultVisible: false,
    getValue: (r) =>
      `${r.createdBy?.firstName ?? ''} ${r.createdBy?.lastName ?? ''}`.trim(),
  },
  {
    key: 'notes',
    label: 'Notas',
    defaultVisible: false,
    getValue: (r) => r.notes ?? '',
  },
];
