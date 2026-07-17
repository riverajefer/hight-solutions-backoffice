// Definición de columnas exportables a Excel para Cuentas por Pagar.
// Fuente única para el modal de exportación: cada columna sabe cómo obtener su
// valor desde una AccountPayable y si es numérica (para la fila de totales).

import type { AccountPayable } from '../../../types/accounts-payable.types';
import { ACCOUNT_PAYABLE_STATUS_CONFIG } from '../../../types/accounts-payable.types';
import type { ExportColumn } from '../../../utils/excelExport';

export type AccountPayableExportColumn = ExportColumn<AccountPayable>;

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

const recurringFrequencyLabel = (
  freq: AccountPayable['recurringFrequency'],
): string => {
  if (!freq) return '';
  const labels: Record<string, string> = {
    BIWEEKLY: 'Quincenal',
    MONTHLY: 'Mensual',
    SEMIANNUAL: 'Semestral',
    ANNUAL: 'Anual',
  };
  return labels[freq] ?? freq;
};

export const ACCOUNT_PAYABLE_EXPORT_COLUMNS: AccountPayableExportColumn[] = [
  // ── Visibles por defecto (espejo de la tabla) ──────────────────────
  {
    key: 'apNumber',
    label: 'Nº CP',
    defaultVisible: true,
    getValue: (ap) => ap.apNumber,
  },
  {
    key: 'description',
    label: 'Descripción',
    defaultVisible: true,
    getValue: (ap) => ap.description,
  },
  {
    key: 'status',
    label: 'Estado',
    defaultVisible: true,
    getValue: (ap) => ACCOUNT_PAYABLE_STATUS_CONFIG[ap.status]?.label ?? ap.status,
  },
  {
    key: 'supplier',
    label: 'Proveedor',
    defaultVisible: true,
    getValue: (ap) => ap.supplier?.name ?? '',
  },
  {
    key: 'expenseType',
    label: 'Tipo de Gasto',
    defaultVisible: true,
    getValue: (ap) => ap.expenseType?.name ?? '',
  },
  {
    key: 'expenseSubcategory',
    label: 'Subcategoría',
    defaultVisible: true,
    getValue: (ap) => ap.expenseSubcategory?.name ?? '',
  },
  {
    key: 'totalAmount',
    label: 'Total',
    defaultVisible: true,
    numeric: true,
    getValue: (ap) => num(ap.totalAmount),
  },
  {
    key: 'paidAmount',
    label: 'Abonado',
    defaultVisible: true,
    numeric: true,
    getValue: (ap) => num(ap.paidAmount),
  },
  {
    key: 'balance',
    label: 'Saldo',
    defaultVisible: true,
    numeric: true,
    getValue: (ap) => num(ap.balance),
  },
  {
    key: 'dueDate',
    label: 'Vencimiento',
    defaultVisible: true,
    getValue: (ap) => formatDate(ap.dueDate),
  },
  {
    key: 'createdAt',
    label: 'Creado',
    defaultVisible: true,
    getValue: (ap) => formatDate(ap.createdAt),
  },
  {
    key: 'createdBy',
    label: 'Creado por',
    defaultVisible: true,
    getValue: (ap) => fullName(ap.createdBy),
  },
  // ── Extra (desmarcadas por defecto) ────────────────────────────────
  {
    key: 'supplierNit',
    label: 'NIT Proveedor',
    defaultVisible: false,
    getValue: (ap) => ap.supplier?.nit ?? '',
  },
  {
    key: 'expenseOrder',
    label: 'Nº OG',
    defaultVisible: false,
    getValue: (ap) => ap.expenseOrder?.ogNumber ?? '',
  },
  {
    key: 'applyIva',
    label: 'IVA',
    defaultVisible: false,
    getValue: (ap) => (ap.applyIva ? 'Sí' : 'No'),
  },
  {
    key: 'ivaRate',
    label: 'IVA (%)',
    defaultVisible: false,
    numeric: true,
    getValue: (ap) => num(ap.ivaRate),
  },
  {
    key: 'isRecurring',
    label: 'Recurrente',
    defaultVisible: false,
    getValue: (ap) => (ap.isRecurring ? 'Sí' : 'No'),
  },
  {
    key: 'recurringFrequency',
    label: 'Frecuencia',
    defaultVisible: false,
    getValue: (ap) => recurringFrequencyLabel(ap.recurringFrequency),
  },
  {
    key: 'observations',
    label: 'Observaciones',
    defaultVisible: false,
    getValue: (ap) => ap.observations ?? '',
  },
  {
    key: 'cancelReason',
    label: 'Motivo de anulación',
    defaultVisible: false,
    getValue: (ap) => ap.cancelReason ?? '',
  },
];
