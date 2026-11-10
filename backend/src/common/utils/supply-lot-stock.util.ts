import { Prisma, SupplyLotStatus } from '../../generated/prisma';

/**
 * Porcentaje del largo inicial por debajo del cual un lote se marca como
 * «bajo inventario» cuando el insumo no define el suyo (`Supply.lowStockPercent`).
 * Un rollo de 100 m alerta desde 10 m.
 */
export const DEFAULT_LOT_LOW_STOCK_PERCENT = 10;

/**
 * Estado que ve el usuario. Combina el ciclo de vida guardado (`status`) con el
 * saldo: «bajo inventario» no se guarda, se deriva del umbral del lote.
 */
export type SupplyLotDisplayStatus =
  | 'AVAILABLE'
  | 'LOW'
  | 'DEPLETED'
  | 'CLOSED'
  | 'VOIDED';

/** Estados con saldo utilizable: los únicos de los que puede salir material. */
export const ACTIVE_LOT_STATUSES: SupplyLotStatus[] = [
  SupplyLotStatus.AVAILABLE,
  SupplyLotStatus.IN_USE,
];

/** Estados que ya terminaron su vida útil y forman el histórico. */
export const FINISHED_LOT_STATUSES: SupplyLotStatus[] = [
  SupplyLotStatus.DEPLETED,
  SupplyLotStatus.CLOSED,
  SupplyLotStatus.VOIDED,
];

/** Umbral en unidades para un lote nuevo: inicial × porcentaje / 100. */
export function computeLowStockQuantity(
  initialQuantity: Prisma.Decimal,
  lowStockPercent?: Prisma.Decimal | number | null,
): Prisma.Decimal {
  const percent =
    lowStockPercent === null || lowStockPercent === undefined
      ? new Prisma.Decimal(DEFAULT_LOT_LOW_STOCK_PERCENT)
      : new Prisma.Decimal(lowStockPercent);
  return initialQuantity.mul(percent).div(100).toDecimalPlaces(4);
}

export function computeLotDisplayStatus(lot: {
  status: SupplyLotStatus;
  remainingQuantity: Prisma.Decimal | number | string;
  lowStockQuantity: Prisma.Decimal | number | string;
}): SupplyLotDisplayStatus {
  if (lot.status === SupplyLotStatus.VOIDED) return 'VOIDED';
  if (lot.status === SupplyLotStatus.CLOSED) return 'CLOSED';

  const remaining = new Prisma.Decimal(lot.remainingQuantity);
  if (lot.status === SupplyLotStatus.DEPLETED || remaining.lessThanOrEqualTo(0)) {
    return 'DEPLETED';
  }
  // Estrictamente por debajo: «menos del 10 %» (100 m alerta con 9,99 m, no con 10 m).
  if (remaining.lessThan(new Prisma.Decimal(lot.lowStockQuantity))) return 'LOW';
  return 'AVAILABLE';
}

/**
 * Deriva del costo por unidad o del valor total el que falte. Se acepta
 * exactamente uno de los dos: con ambos no habría forma de saber cuál manda si
 * no cuadran.
 */
export function resolveLotCosts(
  quantity: Prisma.Decimal,
  input: { unitCost?: number | null; totalCost?: number | null },
): { unitCost: Prisma.Decimal; totalCost: Prisma.Decimal } {
  const hasUnit = input.unitCost !== undefined && input.unitCost !== null;
  const hasTotal = input.totalCost !== undefined && input.totalCost !== null;

  if (hasUnit === hasTotal) {
    throw new Error('Indica el costo por unidad o el valor total, no ambos ni ninguno');
  }

  if (hasUnit) {
    const unitCost = new Prisma.Decimal(input.unitCost as number).toDecimalPlaces(4);
    return { unitCost, totalCost: unitCost.mul(quantity).toDecimalPlaces(2) };
  }

  const totalCost = new Prisma.Decimal(input.totalCost as number).toDecimalPlaces(2);
  return { unitCost: totalCost.div(quantity).toDecimalPlaces(4), totalCost };
}
