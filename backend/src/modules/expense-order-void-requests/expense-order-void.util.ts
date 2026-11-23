import { CashMovementType, Prisma } from '../../generated/prisma';
import {
  daysSince,
  signedCashEffect,
} from '../cash-movement-transfer-requests/cash-movement-transfer.util';

/**
 * Reglas de la anulación de una OG. Funciones puras: el servicio lee la base y
 * les pasa los datos.
 *
 * Decisiones del usuario (2026-11-20), a raíz de OG-2026-1224:
 * - La pide cualquiera; la aprueba un admin distinto de quien la pidió.
 * - Se permite aunque el egreso esté en una caja ya cerrada: se anula en su
 *   sesión original y se recalcula ese cierre (el sobrante de ese día
 *   desaparece). No se mete el dinero en la caja de hoy: el billete que nunca
 *   salió ya pasó al día siguiente con el fondo y se contaría dos veces.
 * - Los rollos de la OG se anulan con ella, salvo que ya tengan consumos.
 */

/** Días que pueden pasar entre el cierre de la sesión del egreso y la solicitud. */
export const VOID_MAX_DAYS_SINCE_CLOSE = 30;

export const MIN_VOID_REASON_LENGTH = 10;

export interface VoidMovementSnapshot {
  receiptNumber: string;
  movementType: CashMovementType;
  paymentMethod: string;
  amount: Prisma.Decimal | string | number;
}

export interface VoidSessionSnapshot {
  status: string;
  closedAt: Date | null;
  countStartedAt: Date | null;
  closingAmount: Prisma.Decimal | string | number | null;
  systemBalance: Prisma.Decimal | string | number | null;
  discrepancy: Prisma.Decimal | string | number | null;
}

/**
 * Por qué no se puede anular un egreso en su sesión, o `null` si sí se puede.
 * `requestedAt` es la fecha de la solicitud: el plazo se cuenta al pedir, no al
 * aprobar, para que un admin que tarda no haga vencer una solicitud a tiempo.
 */
export function movementVoidBlocker(
  movement: Pick<VoidMovementSnapshot, 'receiptNumber'>,
  session: VoidSessionSnapshot,
  requestedAt: Date,
): string | null {
  if (session.status === 'OPEN') return null;
  if (!session.closedAt || session.closingAmount === null || session.systemBalance === null) {
    return `${movement.receiptNumber} está en una sesión sin cierre registrado.`;
  }
  if (daysSince(session.closedAt, requestedAt) > VOID_MAX_DAYS_SINCE_CLOSE) {
    return (
      `${movement.receiptNumber} está en una caja cerrada hace más de ${VOID_MAX_DAYS_SINCE_CLOSE} días: ` +
      'ese arqueo ya no se corrige desde aquí.'
    );
  }
  return null;
}

/**
 * Algo que impide aplicar hoy, pero no pedir: la caja del egreso está en
 * arqueo. Anular un egreso en efectivo cambiaría lo esperado a mitad del conteo.
 */
export function movementApplyIssue(
  movement: Pick<VoidMovementSnapshot, 'receiptNumber' | 'paymentMethod'>,
  session: Pick<VoidSessionSnapshot, 'status' | 'countStartedAt'>,
): string | null {
  if (session.status === 'OPEN' && session.countStartedAt && movement.paymentMethod === 'CASH') {
    return `La caja de ${movement.receiptNumber} está en arqueo. Espera a que cierre o se cancele el conteo.`;
  }
  return null;
}

export interface ClosingEffect {
  systemBalanceBefore: Prisma.Decimal;
  systemBalanceAfter: Prisma.Decimal;
  discrepancyBefore: Prisma.Decimal;
  discrepancyAfter: Prisma.Decimal;
  /** La diferencia queda más lejos de cero que antes. */
  worsens: boolean;
}

/**
 * Cómo queda un cierre si se anulan estos movimientos de su sesión. Solo
 * cuentan los de efectivo: los demás no pasan por el cajón.
 *
 * Parte del esperado **guardado**: el cierre está congelado, y restarle solo
 * el efecto de lo que se anula corrige eso y nada más (igual que el traslado).
 */
export function computeClosingEffectOfVoid(
  session: Pick<VoidSessionSnapshot, 'closingAmount' | 'systemBalance' | 'discrepancy'>,
  movements: Array<Pick<VoidMovementSnapshot, 'movementType' | 'paymentMethod' | 'amount'>>,
): ClosingEffect {
  const systemBalanceBefore = new Prisma.Decimal(session.systemBalance ?? 0);
  const closing = new Prisma.Decimal(session.closingAmount ?? 0);
  const discrepancyBefore =
    session.discrepancy !== null && session.discrepancy !== undefined
      ? new Prisma.Decimal(session.discrepancy)
      : closing.sub(systemBalanceBefore);

  const cashEffect = movements
    .filter((m) => m.paymentMethod === 'CASH')
    .reduce((acc, m) => acc.add(signedCashEffect(m)), new Prisma.Decimal(0));

  const systemBalanceAfter = systemBalanceBefore.sub(cashEffect);
  const discrepancyAfter = closing.sub(systemBalanceAfter);

  return {
    systemBalanceBefore,
    systemBalanceAfter,
    discrepancyBefore,
    discrepancyAfter,
    worsens: discrepancyAfter.abs().greaterThan(discrepancyBefore.abs()),
  };
}
