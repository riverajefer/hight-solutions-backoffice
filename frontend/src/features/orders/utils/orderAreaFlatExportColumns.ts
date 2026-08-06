// Columnas para la hoja "Aplanado por Área" de Órdenes de Pedido.
// Cada fila representa UN producto EN UN área de producción (DTF, Calandra, ...)
// y repite los datos de su orden. Sirve para pivotear la carga y la facturación
// por área sin perder el contexto de la orden.
//
// Un ítem puede pasar por varias áreas, así que un mismo producto genera varias
// filas. Eso obliga a distinguir dos lecturas del dinero (ver más abajo):
// "Total Ítem" se repite tal cual, y "Total Prorrateado" reparte ese total entre
// las áreas del ítem para que la suma por área no infle los ingresos.

import type { Order, OrderItem } from '../../../types/order.types';
import type { ExportColumn } from '../../../utils/excelExport';
import { ORDER_EXPORT_COLUMNS } from './orderExportColumns';

/** Etiqueta para los ítems que no tienen ningún área asignada. */
export const NO_AREA_LABEL = 'Sin área';

/** Fila de la hoja por área: un ítem visto desde una de sus áreas. */
export interface OrderAreaRow {
  order: Order;
  item: OrderItem;
  /** Nombre del área de producción (o `NO_AREA_LABEL`). */
  areaName: string;
  /** Posición del área dentro del ítem (0-based); define quién lleva el residuo. */
  areaIndex: number;
  /** Cuántas áreas tiene el ítem; base del prorrateo (mínimo 1). */
  areaCount: number;
}

/**
 * Expande una Orden en una fila por cada combinación ítem × área.
 * Los ítems sin áreas asignadas no se pierden: salen en una única fila con
 * `NO_AREA_LABEL`, para que la hoja siga cuadrando con el total de la orden.
 */
export const explodeOrderItemAreas = (order: Order): OrderAreaRow[] =>
  (order.items ?? []).flatMap((item) => {
    const areas = item.productionAreas ?? [];
    if (areas.length === 0) {
      return [
        { order, item, areaName: NO_AREA_LABEL, areaIndex: 0, areaCount: 1 },
      ];
    }
    return areas.map((link, index) => ({
      order,
      item,
      areaName: link.productionArea?.name ?? NO_AREA_LABEL,
      areaIndex: index,
      areaCount: areas.length,
    }));
  });

// Columnas de la orden (cabecera) adaptadas a la fila {order, item, area}.
// Se marcan NO numéricas a propósito: sus valores se repiten en cada fila, así
// que sumarlas en TOTALES multiplicaría los montos de la orden.
const orderHeaderColumns: ExportColumn<OrderAreaRow>[] =
  ORDER_EXPORT_COLUMNS.filter((c) => c.defaultVisible).map((c) => ({
    key: `order_${c.key}`,
    label: c.label,
    defaultVisible: true,
    numeric: false,
    getValue: ({ order }: OrderAreaRow) => c.getValue(order),
  }));

const num = (value: string | number | null | undefined): number => {
  const n = typeof value === 'number' ? value : parseFloat(value ?? '');
  return Number.isFinite(n) ? n : 0;
};

/**
 * Reparte el total de un ítem entre sus áreas con 2 decimales, dándole el
 * residuo a la última. Repartir a ciegas no cierra (100 / 3 = 33.33 × 3 = 99.99)
 * y esa diferencia haría que la hoja no cuadre contra la venta real.
 */
const proratedTotal = (
  total: number,
  areaIndex: number,
  areaCount: number,
): number => {
  const count = Math.max(areaCount, 1);
  const share = Math.round((total / count) * 100) / 100;
  if (areaIndex < count - 1) return share;
  // La última área absorbe el residuo para que la suma dé el total exacto.
  return Math.round((total - share * (count - 1)) * 100) / 100;
};

// Columnas de área + producto.
//
// Qué se suma y qué no, para que la fila TOTALES sea confiable:
// - "Cantidad" SÍ suma: si un ítem de 10 unidades pasa por DTF y Calandra, cada
//   área procesa realmente 10 unidades. El total general de la hoja es entonces
//   "unidades procesadas entre todas las áreas", no unidades vendidas.
// - "Precio Unit." y "Total Ítem" NO suman: se repiten por área y sumarlos
//   contaría el mismo dinero varias veces.
// - "Total Prorrateado" SÍ suma: reparte el total del ítem entre sus áreas, así
//   que el total general de la hoja coincide con la venta real.
const areaColumns: ExportColumn<OrderAreaRow>[] = [
  {
    key: 'a_area',
    label: 'Área de Producción',
    defaultVisible: true,
    getValue: ({ areaName }) => areaName,
  },
  {
    key: 'a_product',
    label: 'Producto',
    defaultVisible: true,
    getValue: ({ item }) => item.product?.name ?? '',
  },
  {
    key: 'a_description',
    label: 'Descripción',
    defaultVisible: true,
    getValue: ({ item }) => item.description ?? '',
  },
  {
    key: 'a_quantity',
    label: 'Cantidad',
    defaultVisible: true,
    numeric: true,
    getValue: ({ item }) => num(item.quantity),
  },
  {
    key: 'a_unitPrice',
    label: 'Precio Unit.',
    defaultVisible: true,
    numeric: false,
    getValue: ({ item }) => num(item.unitPrice),
  },
  {
    key: 'a_total',
    label: 'Total Ítem',
    defaultVisible: true,
    numeric: false,
    getValue: ({ item }) => num(item.total),
  },
  {
    key: 'a_areaCount',
    label: 'Nº Áreas del Ítem',
    defaultVisible: true,
    numeric: false,
    getValue: ({ areaCount }) => areaCount,
  },
  {
    key: 'a_totalProrated',
    label: 'Total Prorrateado',
    defaultVisible: true,
    numeric: true,
    getValue: ({ item, areaIndex, areaCount }) =>
      proratedTotal(num(item.total), areaIndex, areaCount),
  },
];

export const ORDER_AREA_FLAT_EXPORT_COLUMNS: ExportColumn<OrderAreaRow>[] = [
  ...orderHeaderColumns,
  ...areaColumns,
];
