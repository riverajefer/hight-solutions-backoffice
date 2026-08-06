import { describe, it, expect } from 'vitest';
import {
  ORDER_AREA_FLAT_EXPORT_COLUMNS,
  explodeOrderItemAreas,
  NO_AREA_LABEL,
  type OrderAreaRow,
} from './orderAreaFlatExportColumns';
import type { Order, OrderItem } from '../../../types/order.types';

const makeItem = (fields: Partial<OrderItem>): OrderItem =>
  ({
    id: 'item-1',
    description: 'Camiseta',
    quantity: 10,
    unitPrice: '5000',
    total: '50000',
    productionAreas: [],
    ...fields,
  }) as OrderItem;

const makeOrder = (items: OrderItem[]): Order =>
  ({ orderNumber: 'OP-001', items }) as Order;

const area = (name: string) => ({ productionArea: { id: name, name } });

const valueOf = (key: string, row: OrderAreaRow): string | number => {
  const col = ORDER_AREA_FLAT_EXPORT_COLUMNS.find((c) => c.key === key);
  if (!col) throw new Error(`columna desconocida: ${key}`);
  return col.getValue(row);
};

const sumProrated = (rows: OrderAreaRow[]): number =>
  rows.reduce((acc, r) => acc + (valueOf('a_totalProrated', r) as number), 0);

describe('explodeOrderItemAreas', () => {
  it('genera una fila por cada área del ítem', () => {
    const order = makeOrder([
      makeItem({ productionAreas: [area('DTF'), area('Calandra')] }),
    ]);
    const rows = explodeOrderItemAreas(order);
    expect(rows.map((r) => r.areaName)).toEqual(['DTF', 'Calandra']);
    expect(rows.every((r) => r.areaCount === 2)).toBe(true);
  });

  it('no pierde los ítems sin áreas asignadas', () => {
    const rows = explodeOrderItemAreas(makeOrder([makeItem({})]));
    expect(rows).toHaveLength(1);
    expect(rows[0].areaName).toBe(NO_AREA_LABEL);
    expect(rows[0].areaCount).toBe(1);
  });

  it('tolera una orden sin ítems', () => {
    expect(explodeOrderItemAreas(makeOrder([]))).toEqual([]);
  });
});

describe('ORDER_AREA_FLAT_EXPORT_COLUMNS — prorrateo', () => {
  it('el total prorrateado suma el total del ítem, no un múltiplo', () => {
    const order = makeOrder([
      makeItem({ total: '50000', productionAreas: [area('DTF'), area('Calandra')] }),
    ]);
    const rows = explodeOrderItemAreas(order);
    expect(valueOf('a_totalProrated', rows[0])).toBe(25000);
    expect(sumProrated(rows)).toBe(50000);
  });

  it('cierra con el total del ítem aunque el reparto no sea exacto', () => {
    const order = makeOrder([
      makeItem({
        total: '100',
        productionAreas: [area('DTF'), area('Calandra'), area('Sublimación')],
      }),
    ]);
    // 100/3 = 33.33 por área; la última absorbe el residuo (33.34).
    const rows = explodeOrderItemAreas(order);
    expect(rows.map((r) => valueOf('a_totalProrated', r))).toEqual([
      33.33, 33.33, 33.34,
    ]);
    expect(sumProrated(rows)).toBe(100);
  });

  it('con una sola área el prorrateo es el total del ítem', () => {
    const order = makeOrder([
      makeItem({ total: '50000', productionAreas: [area('DTF')] }),
    ]);
    const rows = explodeOrderItemAreas(order);
    expect(valueOf('a_totalProrated', rows[0])).toBe(50000);
  });

  it('la cantidad se repite por área (unidades procesadas), no se prorratea', () => {
    const order = makeOrder([
      makeItem({ quantity: 10, productionAreas: [area('DTF'), area('Calandra')] }),
    ]);
    const rows = explodeOrderItemAreas(order);
    expect(rows.map((r) => valueOf('a_quantity', r))).toEqual([10, 10]);
  });

  it('solo Cantidad y Total Prorrateado se suman en TOTALES', () => {
    const numericKeys = ORDER_AREA_FLAT_EXPORT_COLUMNS.filter((c) => c.numeric).map(
      (c) => c.key,
    );
    expect(numericKeys).toEqual(['a_quantity', 'a_totalProrated']);
  });
});
