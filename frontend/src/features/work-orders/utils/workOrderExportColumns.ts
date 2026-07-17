// Definición de columnas exportables a Excel para Órdenes de Trabajo.
// Fuente única para el modal de exportación: cada columna sabe cómo obtener su
// valor desde una WorkOrder y si es numérica (para la fila de totales).

import type { WorkOrder } from '../../../types/work-order.types';
import { WORK_ORDER_STATUS_CONFIG } from '../../../types/work-order.types';
import type { ExportColumn } from '../../../utils/excelExport';

export type WorkOrderExportColumn = ExportColumn<WorkOrder>;

const num = (value: string | null | undefined): number => {
  const n = parseFloat(value ?? '');
  return Number.isFinite(n) ? n : 0;
};

const formatDate = (value?: string | null): string =>
  value ? new Date(value).toLocaleDateString('es-CO') : '';

const fullName = (
  person?: { firstName?: string | null; lastName?: string | null } | null,
): string =>
  person ? `${person.firstName ?? ''} ${person.lastName ?? ''}`.trim() : '';

export const WORK_ORDER_EXPORT_COLUMNS: WorkOrderExportColumn[] = [
  // ── Visibles por defecto (espejo de la tabla) ──────────────────────
  {
    key: 'workOrderNumber',
    label: 'Nº OT',
    defaultVisible: true,
    getValue: (wo) => wo.workOrderNumber,
  },
  {
    key: 'orderNumber',
    label: 'Nº Orden',
    defaultVisible: true,
    getValue: (wo) => wo.order?.orderNumber ?? '',
  },
  {
    key: 'expenseOrders',
    label: 'OG',
    defaultVisible: true,
    getValue: (wo) =>
      (wo.expenseOrders ?? []).map((eo) => eo.ogNumber).join(', '),
  },
  {
    key: 'client',
    label: 'Cliente',
    defaultVisible: true,
    getValue: (wo) => wo.order?.client?.name ?? '',
  },
  {
    key: 'createdBy',
    label: 'Creado Por',
    defaultVisible: true,
    getValue: (wo) => fullName(wo.order?.createdBy),
  },
  {
    key: 'advisor',
    label: 'Asesor',
    defaultVisible: true,
    getValue: (wo) => fullName(wo.advisor),
  },
  {
    key: 'status',
    label: 'Estado',
    defaultVisible: true,
    getValue: (wo) => WORK_ORDER_STATUS_CONFIG[wo.status]?.label ?? wo.status,
  },
  {
    key: 'createdAt',
    label: 'Creada',
    defaultVisible: true,
    getValue: (wo) => formatDate(wo.createdAt),
  },
  // ── Extra (desmarcadas por defecto) ────────────────────────────────
  {
    key: 'designer',
    label: 'Diseñador',
    defaultVisible: false,
    getValue: (wo) => fullName(wo.designer),
  },
  {
    key: 'orderStatus',
    label: 'Estado Orden',
    defaultVisible: false,
    getValue: (wo) => wo.order?.status ?? '',
  },
  {
    key: 'orderTotal',
    label: 'Total Orden',
    defaultVisible: false,
    numeric: true,
    getValue: (wo) => num(wo.order?.total),
  },
  {
    key: 'deliveryDate',
    label: 'F. Entrega',
    defaultVisible: false,
    getValue: (wo) => formatDate(wo.order?.deliveryDate),
  },
  {
    key: 'itemsCount',
    label: 'Nº Ítems',
    defaultVisible: false,
    numeric: true,
    getValue: (wo) => wo.items?.length ?? 0,
  },
  {
    key: 'observations',
    label: 'Observaciones',
    defaultVisible: false,
    getValue: (wo) => wo.observations ?? '',
  },
];
