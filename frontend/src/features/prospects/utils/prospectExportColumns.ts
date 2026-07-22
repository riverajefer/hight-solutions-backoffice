// Definición de columnas exportables a Excel para el Pipeline de Ventas.
// Reemplaza la hoja de cálculo que las vendedoras llevaban a mano.

import type { Prospect } from '../../../types/prospect.types';
import {
  CONTACT_MEDIUM_LABELS,
  PROSPECT_STATUS_LABELS,
} from '../../../types/prospect.types';
import type { ExportColumn } from '../../../utils/excelExport';

export type ProspectExportColumn = ExportColumn<Prospect>;

const formatDate = (value?: string | null): string =>
  value ? new Date(value).toLocaleDateString('es-CO') : '';

const advisorName = (p: Prospect): string =>
  [p.advisor?.firstName, p.advisor?.lastName].filter(Boolean).join(' ') ||
  p.advisor?.email ||
  '';

/** Días transcurridos desde el último contacto; vacío si nunca se contactó. */
const diasSinContacto = (p: Prospect): number | string => {
  if (!p.lastContactAt) return '';
  const ms = Date.now() - new Date(p.lastContactAt).getTime();
  return Math.max(0, Math.floor(ms / 86_400_000));
};

export const PROSPECT_EXPORT_COLUMNS: ProspectExportColumn[] = [
  // ── Visibles por defecto (espejo de la tabla) ──────────────────────
  {
    key: 'name',
    label: 'Nombre',
    defaultVisible: true,
    getValue: (p) => p.name ?? '',
  },
  {
    key: 'phone',
    label: 'Celular',
    defaultVisible: true,
    getValue: (p) => p.phone ?? '',
  },
  {
    key: 'email',
    label: 'Correo',
    defaultVisible: true,
    getValue: (p) => p.email ?? '',
  },
  {
    key: 'status',
    label: 'Estado',
    defaultVisible: true,
    getValue: (p) => PROSPECT_STATUS_LABELS[p.status] ?? p.status,
  },
  {
    key: 'advisor',
    label: 'Vendedora',
    defaultVisible: true,
    getValue: advisorName,
  },
  {
    key: 'lastContactAt',
    label: 'Último contacto',
    defaultVisible: true,
    getValue: (p) => formatDate(p.lastContactAt),
  },
  {
    key: 'lastMedium',
    label: 'Último medio',
    defaultVisible: true,
    getValue: (p) => {
      const last = p.contacts?.[0];
      return last ? CONTACT_MEDIUM_LABELS[last.medium] : '';
    },
  },
  {
    key: 'contactCount',
    label: 'Nº de contactos',
    defaultVisible: true,
    numeric: true,
    getValue: (p) => p.contactCount ?? 0,
  },
  {
    key: 'observation',
    label: 'Observación',
    defaultVisible: true,
    getValue: (p) => p.observation ?? '',
  },
  // ── Opcionales ────────────────────────────────────────────────────
  {
    key: 'diasSinContacto',
    label: 'Días sin contacto',
    defaultVisible: false,
    getValue: diasSinContacto,
  },
  {
    key: 'quoteNumber',
    label: 'Nº Cotización',
    defaultVisible: true,
    getValue: (p) => p.quote?.quoteNumber ?? '',
  },
  {
    key: 'orderNumber',
    label: 'Nº Orden',
    defaultVisible: true,
    // La orden puede venir directa del prospecto o derivada de su cotización;
    // en el segundo caso no traemos el consecutivo, solo el id.
    getValue: (p) => p.order?.orderNumber ?? (p.quote?.orderId ? 'Convertida' : ''),
  },
  {
    key: 'client',
    label: 'Cliente vinculado',
    defaultVisible: false,
    getValue: (p) => p.client?.name ?? '',
  },
  {
    key: 'createdAt',
    label: 'Fecha de registro',
    defaultVisible: false,
    getValue: (p) => formatDate(p.createdAt),
  },
];
