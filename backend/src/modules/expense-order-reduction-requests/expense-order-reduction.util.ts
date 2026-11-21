import { Prisma } from '../../generated/prisma';

/**
 * Reglas puras para bajar el valor de una OG pagada.
 *
 * Decisiones del usuario (2026-11-20):
 * - La diferencia vuelve según dónde esté el dinero: si el proveedor la devuelve,
 *   Caja registra un reintegro al recibirla; si nunca salió del cajón, se corrige
 *   el egreso (y su cierre, si la caja ya cerró), para no contar el billete dos veces.
 * - Aprueba un admin distinto de quien la pidió.
 */

export const MIN_REDUCTION_REASON_LENGTH = 10;

export interface ReductionItemInput {
  itemId: string;
  quantity: number;
  unitPrice: number;
}

export interface CurrentItem {
  id: string;
  name: string;
  quantity: Prisma.Decimal | number | string;
  unitPrice: Prisma.Decimal | number | string;
  total: Prisma.Decimal | number | string;
}

/** Redondea a centavos, como se guardan los totales. */
export const toCents = (value: Prisma.Decimal | number | string) =>
  new Prisma.Decimal(value).toDecimalPlaces(2);

/**
 * Cruza los valores nuevos con los ítems actuales. Exige uno por ítem (no se
 * agregan ni quitan) y que ninguno suba: esto es para bajar el valor.
 */
export function mergeReductionItems(current: CurrentItem[], incoming: ReductionItemInput[]) {
  if (incoming.length !== current.length) {
    throw new Error('Envía los valores de todos los ítems de la OG, sin agregar ni quitar.');
  }
  const byId = new Map(incoming.map((i) => [i.itemId, i]));
  return current.map((item) => {
    const next = byId.get(item.id);
    if (!next) throw new Error(`Falta el ítem «${item.name}».`);
    if (!(next.quantity > 0))
      throw new Error(`La cantidad de «${item.name}» debe ser mayor que cero.`);
    if (next.unitPrice < 0) throw new Error(`El precio de «${item.name}» no puede ser negativo.`);
    const total = toCents(new Prisma.Decimal(next.quantity).mul(next.unitPrice));
    const previousTotal = toCents(item.total);
    if (total.greaterThan(previousTotal)) {
      throw new Error(`«${item.name}» sube de valor. Para subir el total usa «Editar».`);
    }
    return {
      id: item.id,
      name: item.name,
      previousQuantity: new Prisma.Decimal(item.quantity).toString(),
      previousUnitPrice: new Prisma.Decimal(item.unitPrice).toString(),
      previousTotal: previousTotal.toString(),
      quantity: next.quantity,
      unitPrice: next.unitPrice,
      total: total.toString(),
    };
  });
}

export interface ReducibleMovement {
  id: string;
  amount: Prisma.Decimal | number | string;
}

/**
 * Reparte la diferencia entre los egresos, del más reciente al más antiguo:
 * el último pago suele ser el que se registró de más. Ninguno queda negativo.
 * Devuelve cuánto baja cada uno; si no alcanza, `shortfall` es lo que falta.
 */
export function allocateReduction<T extends ReducibleMovement>(
  movementsNewestFirst: T[],
  difference: Prisma.Decimal,
) {
  let remaining = new Prisma.Decimal(difference);
  const allocations: Array<{
    movement: T;
    delta: Prisma.Decimal;
    amountAfter: Prisma.Decimal;
  }> = [];
  for (const movement of movementsNewestFirst) {
    if (remaining.lessThanOrEqualTo(0)) break;
    const amount = new Prisma.Decimal(movement.amount);
    const delta = Prisma.Decimal.min(amount, remaining);
    if (delta.lessThanOrEqualTo(0)) continue;
    allocations.push({ movement, delta, amountAfter: amount.sub(delta) });
    remaining = remaining.sub(delta);
  }
  return { allocations, shortfall: Prisma.Decimal.max(remaining, 0) };
}
