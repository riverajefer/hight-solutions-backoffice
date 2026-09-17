import { Prisma } from '../../generated/prisma';

/**
 * Bloquea la fila de una OP hasta que termine la transacción.
 *
 * El saldo de una OP (`paidAmount`, `balance`, `refundedAmount`,
 * `appliedCreditAmount`, `reversedAmount`) lo escriben once caminos: abonos,
 * ediciones y anulaciones de pagos, devoluciones, saldo a favor, descuento por
 * nómina, anticipos. Todos leen la orden, calculan y escriben la cifra
 * completa. En PostgreSQL una lectura normal no bloquea nada, así que si dos de
 * esos caminos coinciden sobre la misma OP, el segundo en confirmar escribe
 * con una lectura vieja y borra lo que hizo el primero.
 *
 * El ejemplo que lo destapó: Caja paga una devolución de $200.000 sobre una OP
 * con $1.200.000 pagados mientras entra un abono de $50.000. Lo correcto es
 * $1.050.000; quedaba en $1.000.000, con el abono en caja pero no en la OP.
 *
 * Llamando esto antes de leer, cada camino espera a que el otro confirme y lee
 * ya el valor nuevo: en `READ COMMITTED` cada sentencia ve lo confirmado hasta
 * su inicio, y la lectura que sigue al bloqueo empieza después de la espera.
 *
 * Solo sirve si **todos** los caminos lo usan: uno que lea sin bloquear vuelve
 * a abrir la carrera. Volver a bloquear una fila que la misma transacción ya
 * tiene no hace nada, así que no importa que dos helpers anidados lo llamen.
 *
 * Si dos transacciones bloquean OPs distintas en orden cruzado (pasa con el
 * saldo a favor, que toca la OP destino y las de origen), PostgreSQL detecta el
 * interbloqueo y aborta una de las dos con un error. Es un fallo visible que se
 * reintenta, no una cifra equivocada en silencio.
 */
export async function lockOrderForUpdate(
  tx: Pick<Prisma.TransactionClient, '$queryRaw'>,
  orderId: string,
): Promise<void> {
  await tx.$queryRaw`SELECT id FROM orders WHERE id = ${orderId} FOR UPDATE`;
}
