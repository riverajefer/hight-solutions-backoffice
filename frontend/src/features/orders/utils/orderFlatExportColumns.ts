// Columnas para la hoja "Aplanado" de Órdenes de Pedido (Opción C).
// Cada fila representa UN producto y repite los datos de su orden, útil para
// tablas dinámicas (sumar/filtrar por producto conservando el contexto de la
// orden). Reutiliza las columnas de la hoja principal y las del ítem.

import type { ExportColumn } from '../../../utils/excelExport';
import { ORDER_EXPORT_COLUMNS } from './orderExportColumns';
import { explodeOrderItems, type OrderItemRow } from './orderItemExportColumns';

// Reexport para que la página use un único origen al configurar la hoja.
export { explodeOrderItems };

// Columnas de la orden (cabecera) adaptadas a la fila aplanada {order, item}.
// Se marcan NO numéricas a propósito: sus valores se repiten en cada producto,
// así que sumarlas en la fila TOTALES duplicaría los montos de la orden.
const orderHeaderColumns: ExportColumn<OrderItemRow>[] = ORDER_EXPORT_COLUMNS.filter(
  (c) => c.defaultVisible,
).map((c) => ({
  key: `order_${c.key}`,
  label: c.label,
  defaultVisible: true,
  numeric: false,
  getValue: ({ order }: OrderItemRow) => c.getValue(order),
}));

// Columnas del producto (una fila por ítem). Solo estas se suman en TOTALES:
// "Total Ítem" da el total real de productos vendidos sin doble conteo.
const productColumns: ExportColumn<OrderItemRow>[] = [
  {
    key: 'p_description',
    label: 'Descripción',
    defaultVisible: true,
    getValue: ({ item }) => item.description ?? '',
  },
  {
    key: 'p_quantity',
    label: 'Cantidad',
    defaultVisible: true,
    numeric: true,
    getValue: ({ item }) => Number(item.quantity ?? 0),
  },
  {
    key: 'p_unitPrice',
    label: 'Precio Unit.',
    defaultVisible: true,
    numeric: true,
    getValue: ({ item }) => Number(item.unitPrice ?? 0),
  },
  {
    key: 'p_total',
    label: 'Total Ítem',
    defaultVisible: true,
    numeric: true,
    getValue: ({ item }) => Number(item.total ?? 0),
  },
];

export const ORDER_FLAT_EXPORT_COLUMNS: ExportColumn<OrderItemRow>[] = [
  ...orderHeaderColumns,
  ...productColumns,
];
