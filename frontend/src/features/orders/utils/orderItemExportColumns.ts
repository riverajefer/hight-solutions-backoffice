// Definición de columnas para la hoja de detalle "Items" de Órdenes de Pedido.
// Cada fila representa un ítem (producto vendido) de una Orden; la columna Nº Orden
// se repite para poder relacionar/pivotear contra la hoja resumen de órdenes.

import type { Order, OrderItem } from '../../../types/order.types';
import type { ExportColumn } from '../../../utils/excelExport';

/** Fila de la hoja de detalle: un ítem junto a su orden padre. */
export interface OrderItemRow {
  order: Order;
  item: OrderItem;
}

/** Expande una Orden en una fila por cada ítem (para la hoja de detalle). */
export const explodeOrderItems = (order: Order): OrderItemRow[] =>
  (order.items ?? []).map((item) => ({ order, item }));

export const ORDER_ITEM_EXPORT_COLUMNS: ExportColumn<OrderItemRow>[] = [
  {
    key: 'orderNumber',
    label: 'Nº Orden',
    defaultVisible: true,
    getValue: ({ order }) => order.orderNumber,
  },
  {
    key: 'description',
    label: 'Descripción',
    defaultVisible: true,
    getValue: ({ item }) => item.description ?? '',
  },
  {
    key: 'quantity',
    label: 'Cantidad',
    defaultVisible: true,
    numeric: true,
    getValue: ({ item }) => Number(item.quantity ?? 0),
  },
  {
    key: 'unitPrice',
    label: 'Precio Unit.',
    defaultVisible: true,
    numeric: true,
    getValue: ({ item }) => Number(item.unitPrice ?? 0),
  },
  {
    key: 'total',
    label: 'Total',
    defaultVisible: true,
    numeric: true,
    getValue: ({ item }) => Number(item.total ?? 0),
  },
];
