// Definición de columnas exportables a Excel para Clientes.
// Fuente única para el modal de exportación: cada columna sabe cómo obtener su
// valor desde un Client y si es numérica (para la fila de totales).

import type { Client, PersonType } from '../../../types/client.types';
import type { ExportColumn } from '../../../utils/excelExport';

export type ClientExportColumn = ExportColumn<Client>;

const PERSON_TYPE_LABELS: Record<PersonType, string> = {
  NATURAL: 'Natural',
  EMPRESA: 'Empresa',
};

const formatDate = (value?: string | null): string =>
  value ? new Date(value).toLocaleDateString('es-CO') : '';

export const CLIENT_EXPORT_COLUMNS: ClientExportColumn[] = [
  // ── Visibles por defecto (espejo de la tabla) ──────────────────────
  {
    key: 'name',
    label: 'Nombre',
    defaultVisible: true,
    getValue: (c) => c.name,
  },
  {
    key: 'email',
    label: 'Email',
    defaultVisible: true,
    getValue: (c) => c.email ?? '',
  },
  {
    key: 'phone',
    label: 'Teléfono',
    defaultVisible: true,
    getValue: (c) => c.phone ?? '',
  },
  {
    key: 'personType',
    label: 'Tipo',
    defaultVisible: true,
    getValue: (c) => PERSON_TYPE_LABELS[c.personType] ?? c.personType,
  },
  {
    key: 'city',
    label: 'Ciudad',
    defaultVisible: true,
    getValue: (c) => c.city?.name ?? '',
  },
  {
    key: 'department',
    label: 'Departamento',
    defaultVisible: true,
    getValue: (c) => c.department?.name ?? '',
  },
  {
    key: 'advisor',
    label: 'Creado por',
    defaultVisible: true,
    getValue: (c) =>
      `${c.advisor?.firstName ?? ''} ${c.advisor?.lastName ?? ''}`.trim(),
  },
  {
    key: 'isActive',
    label: 'Estado',
    defaultVisible: true,
    getValue: (c) => (c.isActive ? 'Activo' : 'Inactivo'),
  },
  {
    key: 'saldoAFavor',
    label: 'Saldo a favor',
    defaultVisible: true,
    numeric: true,
    getValue: (c) => c.saldoAFavor ?? 0,
  },
  // ── Extra (desmarcadas por defecto) ────────────────────────────────
  {
    key: 'nit',
    label: 'NIT',
    defaultVisible: false,
    getValue: (c) => c.nit ?? '',
  },
  {
    key: 'cedula',
    label: 'Cédula',
    defaultVisible: false,
    getValue: (c) => c.cedula ?? '',
  },
  {
    key: 'manager',
    label: 'Gerente',
    defaultVisible: false,
    getValue: (c) => c.manager ?? '',
  },
  {
    key: 'encargado',
    label: 'Encargado',
    defaultVisible: false,
    getValue: (c) => c.encargado ?? '',
  },
  {
    key: 'landlinePhone',
    label: 'Teléfono fijo',
    defaultVisible: false,
    getValue: (c) => c.landlinePhone ?? '',
  },
  {
    key: 'address',
    label: 'Dirección',
    defaultVisible: false,
    getValue: (c) => c.address ?? '',
  },
  {
    key: 'specialCondition',
    label: 'Condición especial',
    defaultVisible: false,
    getValue: (c) => c.specialCondition ?? '',
  },
  {
    key: 'createdAt',
    label: 'Creado',
    defaultVisible: false,
    getValue: (c) => formatDate(c.createdAt),
  },
];
