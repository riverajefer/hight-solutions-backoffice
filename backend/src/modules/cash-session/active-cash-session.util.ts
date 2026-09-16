import { ConflictException } from '@nestjs/common';
import { CashSessionStatus, Prisma } from '../../generated/prisma';

/**
 * Resolución de "la caja abierta" para los flujos que mueven dinero.
 *
 * Hasta ahora cada flujo hacía su propio `findFirst({ status: 'OPEN' })`, sin
 * `cashRegisterId` y sin `orderBy`: el motor devolvía la fila que quisiera. Con
 * una sola caja registrada eso funciona por casualidad, no por diseño. Con dos
 * cajas abiertas a la vez —tres sedes, o simplemente un segundo punto de venta—
 * el dinero de una se registra en la otra y ningún arqueo cuadra.
 *
 * Por eso esta función no adivina. Si hay exactamente una caja abierta la
 * devuelve; si hay varias, falla y obliga a decidir. Perder un movimiento en la
 * caja equivocada es mucho más caro de reconstruir que repetir la operación.
 *
 * El índice parcial `cash_sessions_one_open_per_register` garantiza como máximo
 * una sesión abierta por caja, así que dos resultados son siempre dos cajas
 * distintas.
 */

export interface ActiveCashSession {
  id: string;
  cashRegisterId: string;
}

/** Acepta tanto `PrismaService` como el cliente de una transacción. */
type CashSessionClient = Pick<Prisma.TransactionClient, 'cashSession'>;

export const MULTIPLE_OPEN_SESSIONS_MESSAGE =
  'Hay más de una caja abierta y el sistema no puede saber en cuál registrar ' +
  'este movimiento. Cierra la caja que no corresponda y vuelve a intentarlo.';

/**
 * Devuelve la sesión de caja abierta, o `null` si no hay ninguna.
 *
 * @param client  `PrismaService` o el `tx` de una transacción en curso.
 * @param cashRegisterId  Caja concreta. Cuando el llamador sabe a qué caja va el
 *   movimiento no hay ambigüedad posible: es el camino que habrá que usar el día
 *   que exista la dimensión de sede.
 *
 * @throws ConflictException si hay varias cajas abiertas y no se indicó cuál.
 */
export async function findActiveCashSession(
  client: CashSessionClient,
  cashRegisterId?: string,
): Promise<ActiveCashSession | null> {
  if (cashRegisterId) {
    return client.cashSession.findFirst({
      where: { cashRegisterId, status: CashSessionStatus.OPEN },
      select: { id: true, cashRegisterId: true },
    });
  }

  // `take: 2` alcanza: solo hace falta distinguir "ninguna", "una" y "más de una".
  const open = await client.cashSession.findMany({
    where: { status: CashSessionStatus.OPEN },
    select: { id: true, cashRegisterId: true },
    orderBy: { openedAt: 'asc' },
    take: 2,
  });

  if (open.length === 0) return null;
  if (open.length === 1) return open[0];

  throw new ConflictException(MULTIPLE_OPEN_SESSIONS_MESSAGE);
}
