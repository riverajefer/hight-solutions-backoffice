// Definición de columnas exportables a Excel para Órdenes de Pedido.
// Fuente única para el modal de exportación: cada columna sabe cómo obtener su
// valor desde una Order y si es numérica (para la fila de totales).

import type { Order } from '../../../types/order.types';
import {
  ORDER_STATUS_CONFIG,
  PAYMENT_METHOD_LABELS,
} from '../../../types/order.types';
import { formatDate, formatDateTime, getDaysSince } from './orderFormatters';

export interface OrderExportColumn {
  /** Clave estable (se persiste en localStorage). */
  key: string;
  /** Encabezado en español para la hoja de Excel. */
  label: string;
  /** Si aparece marcada por defecto (espejo de las columnas visibles de la tabla). */
  defaultVisible: boolean;
  /** Si es numérica: el valor se exporta como número y se suma en la fila de totales. */
  numeric?: boolean;
  /** Obtiene el valor de la celda para una orden. */
  getValue: (order: Order) => string | number;
}

const num = (value: string | null | undefined): number => {
  const n = parseFloat(value ?? '');
  return Number.isFinite(n) ? n : 0;
};

const advancePaymentLabel = (status: Order['advancePaymentStatus']): string => {
  if (!status) return '';
  const labels: Record<string, string> = {
    PENDING: 'Pendiente',
    APPROVED: 'Aprobado',
    REJECTED: 'Rechazado',
  };
  return labels[status] ?? status;
};

const productionAreasLabel = (order: Order): string => {
  const areas = new Set<string>();
  order.items?.forEach((item) => {
    item.productionAreas?.forEach((pa) => {
      if (pa.productionArea?.name) areas.add(pa.productionArea.name);
    });
  });
  return Array.from(areas).join(', ');
};

const paymentMethodsLabel = (order: Order): string => {
  const methods = new Set<string>();
  order.payments?.forEach((p) => {
    methods.add(PAYMENT_METHOD_LABELS[p.paymentMethod] ?? p.paymentMethod);
  });
  return Array.from(methods).join(', ');
};

export const ORDER_EXPORT_COLUMNS: OrderExportColumn[] = [
  // ── Visibles por defecto (espejo de la tabla) ──────────────────────
  {
    key: 'orderNumber',
    label: 'Nº Orden',
    defaultVisible: true,
    getValue: (o) => o.orderNumber,
  },
  {
    key: 'status',
    label: 'Estado',
    defaultVisible: true,
    getValue: (o) => ORDER_STATUS_CONFIG[o.status]?.label ?? o.status,
  },
  {
    key: 'client',
    label: 'Cliente',
    defaultVisible: true,
    getValue: (o) => o.client?.name ?? '',
  },
  {
    key: 'workOrder',
    label: 'OT',
    defaultVisible: true,
    getValue: (o) => o.workOrders?.[0]?.workOrderNumber ?? '',
  },
  {
    key: 'orderDate',
    label: 'Fecha Orden',
    defaultVisible: true,
    getValue: (o) => formatDateTime(o.orderDate),
  },
  {
    key: 'deliveryDate',
    label: 'F. Entrega',
    defaultVisible: true,
    getValue: (o) => (o.deliveryDate ? formatDate(o.deliveryDate) : ''),
  },
  {
    key: 'daysSinceCreation',
    label: 'Días',
    defaultVisible: true,
    numeric: true,
    getValue: (o) => getDaysSince(o.createdAt),
  },
  {
    key: 'advisor',
    label: 'Asesor',
    defaultVisible: true,
    getValue: (o) =>
      `${o.createdBy?.firstName ?? ''} ${o.createdBy?.lastName ?? ''}`.trim(),
  },
  {
    key: 'productionAreas',
    label: 'Áreas',
    defaultVisible: true,
    getValue: productionAreasLabel,
  },
  {
    key: 'iva',
    label: 'IVA',
    defaultVisible: true,
    getValue: (o) => (num(o.taxRate) > 0 ? 'SÍ' : 'NO'),
  },
  {
    key: 'colorProof',
    label: 'P. Color',
    defaultVisible: true,
    getValue: (o) => (o.requiresColorProof ? 'Sí' : 'No'),
  },
  {
    key: 'total',
    label: 'Total',
    defaultVisible: true,
    numeric: true,
    getValue: (o) => num(o.total),
  },
  {
    key: 'balance',
    label: 'Saldo',
    defaultVisible: true,
    numeric: true,
    getValue: (o) => num(o.balance),
  },
  {
    key: 'advancePaymentStatus',
    label: 'Anticipo',
    defaultVisible: true,
    getValue: (o) => advancePaymentLabel(o.advancePaymentStatus),
  },
  // ── Extra (desmarcadas por defecto) ────────────────────────────────
  {
    key: 'subtotal',
    label: 'Subtotal',
    defaultVisible: false,
    numeric: true,
    getValue: (o) => num(o.subtotal),
  },
  {
    key: 'tax',
    label: 'IVA (monto)',
    defaultVisible: false,
    numeric: true,
    getValue: (o) => num(o.tax),
  },
  {
    key: 'retefuente',
    label: 'Retefuente (%)',
    defaultVisible: false,
    numeric: true,
    getValue: (o) => num(o.retefuenteRate) * 100,
  },
  {
    key: 'reteICA',
    label: 'ReteICA (%)',
    defaultVisible: false,
    numeric: true,
    getValue: (o) => num(o.reteICARate) * 100,
  },
  {
    key: 'reteIVA',
    label: 'ReteIVA (%)',
    defaultVisible: false,
    numeric: true,
    getValue: (o) => num(o.reteIVARate) * 100,
  },
  {
    key: 'discountAmount',
    label: 'Descuentos',
    defaultVisible: false,
    numeric: true,
    getValue: (o) => num(o.discountAmount),
  },
  {
    key: 'paidAmount',
    label: 'Pagado',
    defaultVisible: false,
    numeric: true,
    getValue: (o) => num(o.paidAmount),
  },
  {
    key: 'paymentMethods',
    label: 'Métodos de pago',
    defaultVisible: false,
    getValue: paymentMethodsLabel,
  },
  {
    key: 'electronicInvoiceNumber',
    label: 'Factura electrónica',
    defaultVisible: false,
    getValue: (o) => o.electronicInvoiceNumber ?? '',
  },
  {
    key: 'commercialChannel',
    label: 'Canal comercial',
    defaultVisible: false,
    getValue: (o) => o.commercialChannel?.name ?? '',
  },
  {
    key: 'notes',
    label: 'Notas',
    defaultVisible: false,
    getValue: (o) => o.notes ?? '',
  },
];
