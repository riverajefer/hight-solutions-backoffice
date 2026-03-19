import type { FieldType } from '../../../../../types/production.types';

export interface FieldTypeDefinition {
  type: FieldType;
  label: string;
  description: string;
  defaultLabel: string;
  category: 'basico' | 'fecha' | 'referencia' | 'numerico';
  defaultRequired?: boolean;
  defaultStage?: 'specification' | 'execution';
}

export const FIELD_TYPE_DEFINITIONS: FieldTypeDefinition[] = [
  // ─── Básico ────────────────────────────────────────────────────────────────
  {
    type: 'text',
    label: 'Texto',
    description: 'Campo de texto libre de una línea',
    defaultLabel: 'Nuevo campo de texto',
    category: 'basico',
    defaultRequired: false,
  },
  {
    type: 'textarea',
    label: 'Área de texto',
    description: 'Campo de texto multilínea para observaciones',
    defaultLabel: 'Observaciones',
    category: 'basico',
    defaultRequired: false,
    defaultStage: 'execution',
  },
  {
    type: 'boolean',
    label: 'Sí / No',
    description: 'Casilla de verificación (aprobado / rechazado)',
    defaultLabel: 'Aprobado',
    category: 'basico',
    defaultRequired: false,
    defaultStage: 'execution',
  },
  {
    type: 'select',
    label: 'Selección',
    description: 'Lista desplegable con opciones predefinidas',
    defaultLabel: 'Seleccionar',
    category: 'basico',
    defaultRequired: false,
  },
  // ─── Numérico ──────────────────────────────────────────────────────────────
  {
    type: 'number',
    label: 'Número',
    description: 'Campo numérico entero o decimal',
    defaultLabel: 'Nuevo campo numérico',
    category: 'numerico',
    defaultRequired: false,
  },
  {
    type: 'measurement',
    label: 'Medidas',
    description: 'Campo compuesto: ancho × alto con unidad',
    defaultLabel: 'Medidas',
    category: 'numerico',
    defaultRequired: false,
    defaultStage: 'specification',
  },
  {
    type: 'quantity',
    label: 'Cantidad',
    description: 'Número con unidad (kg, unidades, pliegos, etc.)',
    defaultLabel: 'Cantidad',
    category: 'numerico',
    defaultRequired: true,
  },
  // ─── Fecha ─────────────────────────────────────────────────────────────────
  {
    type: 'date',
    label: 'Fecha',
    description: 'Selector de fecha',
    defaultLabel: 'Fecha',
    category: 'fecha',
    defaultRequired: false,
  },
  {
    type: 'datetime',
    label: 'Fecha y hora',
    description: 'Selector de fecha y hora',
    defaultLabel: 'Fecha y hora',
    category: 'fecha',
    defaultRequired: false,
  },
  // ─── Referencia ────────────────────────────────────────────────────────────
  {
    type: 'supplier',
    label: 'Proveedor',
    description: 'Selector que consulta proveedores del sistema',
    defaultLabel: 'Proveedor',
    category: 'referencia',
    defaultRequired: true,
    defaultStage: 'specification',
  },
  {
    type: 'client',
    label: 'Cliente',
    description: 'Selector que consulta clientes del sistema',
    defaultLabel: 'Cliente',
    category: 'referencia',
    defaultRequired: false,
    defaultStage: 'specification',
  },
  {
    type: 'material',
    label: 'Material',
    description: 'Selector que consulta materiales del sistema',
    defaultLabel: 'Material',
    category: 'referencia',
    defaultRequired: true,
    defaultStage: 'specification',
  },
];

export const CATEGORY_LABELS: Record<FieldTypeDefinition['category'], string> = {
  basico: 'Básico',
  numerico: 'Numérico',
  fecha: 'Fecha',
  referencia: 'Referencia',
};

export const CATEGORY_ORDER: FieldTypeDefinition['category'][] = [
  'basico',
  'numerico',
  'fecha',
  'referencia',
];
