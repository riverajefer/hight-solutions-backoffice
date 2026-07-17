// Definición de columnas exportables a Excel para Órdenes de Gasto.
// Fuente única para el modal de exportación: cada columna sabe cómo obtener su
// valor desde una ExpenseOrder y si es numérica (para la fila de totales).

import type { ExpenseOrder } from '../../../types/expense-order.types';
import { EXPENSE_ORDER_STATUS_CONFIG } from '../../../types/expense-order.types';
import type { ExportColumn } from '../../../utils/excelExport';

export type ExpenseOrderExportColumn = ExportColumn<ExpenseOrder>;

const formatDate = (value?: string | null): string =>
  value ? new Date(value).toLocaleDateString('es-CO') : '';

const fullName = (
  person?: { firstName?: string | null; lastName?: string | null } | null,
): string =>
  person ? `${person.firstName ?? ''} ${person.lastName ?? ''}`.trim() : '';

/** Total de la OG: suma de los totales de sus ítems (igual que la tabla). */
const orderTotal = (eo: ExpenseOrder): number =>
  (eo.items ?? []).reduce((acc, item) => acc + Number(item.total ?? 0), 0);

export const EXPENSE_ORDER_EXPORT_COLUMNS: ExpenseOrderExportColumn[] = [
  // ── Visibles por defecto (espejo de la tabla) ──────────────────────
  {
    key: 'ogNumber',
    label: 'Nº OG',
    defaultVisible: true,
    getValue: (eo) => eo.ogNumber,
  },
  {
    key: 'status',
    label: 'Estado',
    defaultVisible: true,
    getValue: (eo) => EXPENSE_ORDER_STATUS_CONFIG[eo.status]?.label ?? eo.status,
  },
  {
    key: 'expenseType',
    label: 'Tipo',
    defaultVisible: true,
    getValue: (eo) => eo.expenseType?.name ?? '',
  },
  {
    key: 'expenseSubcategory',
    label: 'Subcategoría',
    defaultVisible: true,
    getValue: (eo) => eo.expenseSubcategory?.name ?? '',
  },
  {
    key: 'authorizedTo',
    label: 'Autorizado a',
    defaultVisible: true,
    getValue: (eo) => fullName(eo.authorizedTo),
  },
  {
    key: 'workOrder',
    label: 'OT',
    defaultVisible: true,
    getValue: (eo) => eo.workOrder?.workOrderNumber ?? '',
  },
  {
    key: 'total',
    label: 'Total',
    defaultVisible: true,
    numeric: true,
    getValue: orderTotal,
  },
  {
    key: 'createdAt',
    label: 'Fecha',
    defaultVisible: true,
    getValue: (eo) => formatDate(eo.createdAt),
  },
  // ── Extra (desmarcadas por defecto) ────────────────────────────────
  {
    key: 'orderNumber',
    label: 'Nº Orden',
    defaultVisible: false,
    getValue: (eo) => eo.workOrder?.order?.orderNumber ?? '',
  },
  {
    key: 'client',
    label: 'Cliente',
    defaultVisible: false,
    getValue: (eo) => eo.workOrder?.order?.client?.name ?? '',
  },
  {
    key: 'areaOrMachine',
    label: 'Área / Máquina',
    defaultVisible: false,
    getValue: (eo) => eo.areaOrMachine ?? '',
  },
  {
    key: 'createdBy',
    label: 'Creado por',
    defaultVisible: false,
    getValue: (eo) => fullName(eo.createdBy),
  },
  {
    key: 'responsible',
    label: 'Responsable',
    defaultVisible: false,
    getValue: (eo) => fullName(eo.responsible),
  },
  {
    key: 'authorizedBy',
    label: 'Autorizado por',
    defaultVisible: false,
    getValue: (eo) => fullName(eo.authorizedBy),
  },
  {
    key: 'authorizedAt',
    label: 'F. Autorización',
    defaultVisible: false,
    getValue: (eo) => formatDate(eo.authorizedAt),
  },
  {
    key: 'applyIva',
    label: 'IVA',
    defaultVisible: false,
    getValue: (eo) => (eo.applyIva ? 'Sí' : 'No'),
  },
  {
    key: 'itemsCount',
    label: 'Nº Ítems',
    defaultVisible: false,
    numeric: true,
    getValue: (eo) => eo.items?.length ?? 0,
  },
  {
    key: 'observations',
    label: 'Observaciones',
    defaultVisible: false,
    getValue: (eo) => eo.observations ?? '',
  },
];
