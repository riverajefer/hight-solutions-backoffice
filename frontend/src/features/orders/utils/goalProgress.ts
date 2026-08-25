import type { AdvisorBreakdown } from '../../../types/order.types';

/**
 * Avance de una meta mensual de ventas.
 *
 * La meta se mide sobre lo **comisionable**: OP entregadas y pagadas al 100%,
 * que es la regla con la que el cliente liquida comisiones. El vendido total se
 * conserva como referencia y para dibujar el segundo segmento de la barra: sin
 * él, una tarjeta en 0% no dice si el asesor no vendió o si vendió y todavía no
 * ha registrado las entregas.
 */

export type GoalStatusColor = 'success' | 'warning' | 'error';

export interface GoalProgress {
  /** Comisionable del mes: es el numerador del avance. */
  commissionable: number;
  /** Venta neta total del mes, comisione o no. */
  sold: number;
  target: number;
  /** % de avance sin recortar; puede pasar de 100. */
  pct: number;
  /** % recortado a 100, para el ancho de las barras. */
  pctCapped: number;
  /** % que representa el vendido total sobre la meta, recortado a 100. */
  soldPctCapped: number;
  /** Comisionable − meta. Negativo cuando falta para alcanzarla. */
  diff: number;
  /** OP pagadas que aún no comisionan por no estar marcadas como entregadas. */
  gapOrders: number;
  gapAmount: number;
  statusColor: GoalStatusColor;
  statusLabel: string;
}

const cap = (pct: number) => Math.min(Math.max(pct, 0), 100);

export function getGoalStatusColor(pct: number): GoalStatusColor {
  if (pct >= 100) return 'success';
  if (pct >= 70) return 'warning';
  return 'error';
}

const STATUS_LABELS: Record<GoalStatusColor, string> = {
  success: 'Superada',
  warning: 'En camino',
  error: 'En riesgo',
};

export function computeGoalProgress(
  sales: AdvisorBreakdown | undefined,
  targetAmount: number | string,
): GoalProgress {
  const commissionable = sales?.commissionableNetSubtotal ?? 0;
  const sold = sales?.totalNetSubtotal ?? 0;
  const target = Number(targetAmount);

  // Una meta en 0 no se puede "cumplir": dejar el avance en 0 evita mostrar
  // Infinity o un 100% que no significa nada.
  const ratio = (value: number) => (target > 0 ? (value / target) * 100 : 0);
  const pct = ratio(commissionable);
  const statusColor = getGoalStatusColor(pct);

  return {
    commissionable,
    sold,
    target,
    pct,
    pctCapped: cap(pct),
    soldPctCapped: cap(ratio(sold)),
    diff: commissionable - target,
    gapOrders: sales?.gapOrders ?? 0,
    gapAmount: sales?.gapNetSubtotal ?? 0,
    statusColor,
    statusLabel: STATUS_LABELS[statusColor],
  };
}
