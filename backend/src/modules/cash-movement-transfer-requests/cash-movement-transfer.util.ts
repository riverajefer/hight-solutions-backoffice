import { CashMovementType, Prisma } from '../../generated/prisma';
import { BUSINESS_TIMEZONE } from '../../common/utils/date-range.util';

/**
 * Reglas del traslado de un movimiento de una sesión cerrada a la abierta.
 * Funciones puras: el servicio lee la base y les pasa los datos.
 *
 * Decisiones del usuario (2026-11-04), en docs/PROPUESTA_TRASLADO_MOVIMIENTOS_CAJA.md:
 * plazo de 30 días, cruce de mes permitido con advertencia, solo efectivo.
 */

/** Días que pueden pasar entre el cierre de origen y la solicitud. */
export const TRANSFER_MAX_DAYS = 30;

export const MIN_TRANSFER_REASON_LENGTH = 10;

export interface TransferMovementSnapshot {
  movementType: CashMovementType;
  paymentMethod: string;
  amount: Prisma.Decimal | string | number;
  isVoided: boolean;
  counterMovementId: string | null;
  /** Presente solo si el movimiento es la reversa de otro. */
  isReversal: boolean;
}

export interface TransferSessionSnapshot {
  status: string;
  closedAt: Date | null;
  closingAmount: Prisma.Decimal | string | number | null;
  systemBalance: Prisma.Decimal | string | number | null;
  discrepancy: Prisma.Decimal | string | number | null;
}

/**
 * Por qué un movimiento no se puede trasladar, o `null` si sí se puede.
 * Lo que depende de la sesión destino (que haya una abierta y sin arqueo) se
 * revisa aparte, porque al pedir todavía puede no haber caja abierta.
 */
export function transferIneligibilityReason(
  movement: TransferMovementSnapshot,
  source: TransferSessionSnapshot,
  now: Date,
): string | null {
  if (movement.paymentMethod !== 'CASH') {
    return 'Solo se pueden trasladar movimientos en efectivo: los demás no pasan por el cajón.';
  }
  if (movement.isVoided || movement.counterMovementId) {
    return 'El movimiento está anulado.';
  }
  if (movement.isReversal) {
    return 'El movimiento es la reversa de una anulación.';
  }
  if (
    source.status !== 'CLOSED' ||
    !source.closedAt ||
    source.closingAmount === null ||
    source.systemBalance === null
  ) {
    return 'El movimiento está en una sesión abierta: no hay cierre que corregir.';
  }
  if (daysSince(source.closedAt, now) > TRANSFER_MAX_DAYS) {
    return `Solo se pueden trasladar movimientos de sesiones cerradas hace ${TRANSFER_MAX_DAYS} días o menos.`;
  }
  return null;
}

export function daysSince(from: Date, now: Date): number {
  return (now.getTime() - from.getTime()) / (24 * 60 * 60 * 1000);
}

/** Efecto del movimiento en el efectivo esperado: + entra al cajón, − sale. */
export function signedCashEffect(movement: {
  movementType: CashMovementType;
  amount: Prisma.Decimal | string | number;
}): Prisma.Decimal {
  const amount = new Prisma.Decimal(movement.amount);
  return movement.movementType === 'INCOME' || movement.movementType === 'DEPOSIT'
    ? amount
    : amount.neg();
}

export interface SourceClosingEffect {
  systemBalanceBefore: Prisma.Decimal;
  systemBalanceAfter: Prisma.Decimal;
  discrepancyBefore: Prisma.Decimal;
  discrepancyAfter: Prisma.Decimal;
  /** La diferencia queda más lejos de cero que antes. */
  worsens: boolean;
}

/**
 * Cómo queda el cierre de origen si el movimiento sale de él.
 *
 * Parte del esperado **guardado**, no de uno recalculado: el cierre está
 * congelado y una anulación posterior de otro movimiento de esa sesión ya lo
 * habría desalineado. Restar solo el efecto de este movimiento corrige
 * exactamente lo que se traslada y nada más.
 */
export function computeSourceClosingEffect(
  source: Pick<TransferSessionSnapshot, 'closingAmount' | 'systemBalance' | 'discrepancy'>,
  movement: { movementType: CashMovementType; amount: Prisma.Decimal | string | number },
): SourceClosingEffect {
  const systemBalanceBefore = new Prisma.Decimal(source.systemBalance ?? 0);
  const closing = new Prisma.Decimal(source.closingAmount ?? 0);
  const discrepancyBefore =
    source.discrepancy !== null && source.discrepancy !== undefined
      ? new Prisma.Decimal(source.discrepancy)
      : closing.sub(systemBalanceBefore);

  const systemBalanceAfter = systemBalanceBefore.sub(signedCashEffect(movement));
  const discrepancyAfter = closing.sub(systemBalanceAfter);

  return {
    systemBalanceBefore,
    systemBalanceAfter,
    discrepancyBefore,
    discrepancyAfter,
    worsens: discrepancyAfter.abs().greaterThan(discrepancyBefore.abs()),
  };
}

/** Año-mes en la hora de Colombia, p. ej. "2026-10". */
export function businessMonth(date: Date): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: BUSINESS_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
  }).formatToParts(date);
  const year = parts.find((p) => p.type === 'year')?.value;
  const month = parts.find((p) => p.type === 'month')?.value;
  return `${year}-${month}`;
}

export function monthLabel(date: Date): string {
  return date.toLocaleString('es-CO', { timeZone: BUSINESS_TIMEZONE, month: 'long', year: 'numeric' });
}

/**
 * El traslado cambia el arqueo de un mes anterior. Se permite, con
 * advertencia: contabilidad puede haber cerrado ya ese mes.
 */
export function crossesMonth(sourceClosedAt: Date, now: Date): boolean {
  return businessMonth(sourceClosedAt) !== businessMonth(now);
}

export function formatCop(value: Prisma.Decimal | string | number): string {
  return Number(String(value)).toLocaleString('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  });
}

export function formatSignedCop(value: Prisma.Decimal | string | number): string {
  const n = Number(String(value));
  return `${n > 0 ? '+' : ''}${formatCop(n)}`;
}

export function formatBusinessDateTime(date: Date): string {
  return date.toLocaleString('es-CO', {
    timeZone: BUSINESS_TIMEZONE,
    dateStyle: 'short',
    timeStyle: 'short',
  });
}
