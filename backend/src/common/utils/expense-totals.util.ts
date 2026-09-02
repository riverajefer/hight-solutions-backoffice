/**
 * Cálculo del monto a pagar de una Orden de Gasto o una Cuenta por Pagar.
 *
 * Vive aquí porque la OG y la CxP que nace de ella tienen que llegar al mismo
 * número: si cada una lo calcula por su lado, la cuenta se paga por un valor y
 * la orden dice otro. Es la misma estructura que usa la OP
 * (`orders.service`): retefuente y ReteICA sobre el subtotal, ReteIVA sobre el
 * IVA. La diferencia es el redondeo, aquí siempre a peso entero: en el gasto no
 * aplica el redondeo comercial a múltiplos de 100 (no hay efectivo de por medio
 * necesariamente) pero dejar centavos deja saldos de $0,50 imposibles de saldar.
 */

export interface ExpenseWithholdingRates {
  applyIva?: boolean | null;
  /** Tasa en decimal (0.19 = 19%). */
  ivaRate?: number | string | { toString(): string } | null;
  retefuenteRate?: number | string | { toString(): string } | null;
  reteICARate?: number | string | { toString(): string } | null;
  reteIVARate?: number | string | { toString(): string } | null;
}

export interface ExpenseTotals {
  subtotal: number;
  ivaAmount: number;
  retefuenteAmount: number;
  reteICAAmount: number;
  reteIVAAmount: number;
  /** Lo que hay que pagarle al proveedor, redondeado a peso entero. */
  total: number;
}

const toRate = (value: ExpenseWithholdingRates[keyof ExpenseWithholdingRates]): number => {
  if (value === null || value === undefined) return 0;
  const parsed = Number(value.toString());
  return Number.isFinite(parsed) ? parsed : 0;
};

/** Redondeo half-up a peso entero, igual que `formatCurrency` en el frontend. */
const roundToWholePeso = (value: number): number => Math.round(value);

export function computeExpenseTotals(
  subtotal: number,
  rates: ExpenseWithholdingRates,
): ExpenseTotals {
  const ivaRate = rates.applyIva ? (rates.ivaRate != null ? toRate(rates.ivaRate) : 0.19) : 0;
  const ivaAmount = subtotal * ivaRate;

  const retefuenteAmount = subtotal * toRate(rates.retefuenteRate);
  const reteICAAmount = subtotal * toRate(rates.reteICARate);
  const reteIVAAmount = ivaAmount * toRate(rates.reteIVARate);

  const rawTotal =
    subtotal - retefuenteAmount - reteICAAmount + ivaAmount - reteIVAAmount;

  return {
    subtotal,
    ivaAmount,
    retefuenteAmount,
    reteICAAmount,
    reteIVAAmount,
    total: roundToWholePeso(rawTotal),
  };
}
