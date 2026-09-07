/**
 * ¿Este error es el choque contra un índice único concreto?
 *
 * `PrismaService` usa el adaptador `PrismaPg`, no el motor nativo, y con ese
 * adaptador el `P2002` llega con **`meta.target` vacío**: el nombre de la
 * restricción violada viaja dentro de `meta.driverAdapterError`, en
 * `cause.constraint.fields` y en `cause.originalMessage`.
 *
 * Por eso se busca sobre el meta completo serializado y no sobre `meta.target`:
 * un `catch` que lea `target` nunca acierta, la rama no se ejecuta y lo que el
 * usuario recibe es un 500.
 *
 * Se compara contra el nombre del índice, y no solo contra el código P2002,
 * para no confundir esta carrera con cualquier otra restricción única de la
 * misma tabla.
 *
 * @param error      El error capturado.
 * @param constraint Nombre del índice o de la columna (ej.
 *                   `refund_requests_pending_unique`, `idempotency_key`).
 */
export function isUniqueViolationOn(
  error: unknown,
  constraint: string,
): boolean {
  const known = error as { code?: string; meta?: unknown };
  if (known?.code !== 'P2002') return false;

  return JSON.stringify(known.meta ?? '').includes(constraint);
}

/**
 * Crea una solicitud y, si pierde la carrera contra su índice parcial de
 * "una sola pendiente", devuelve la solicitud gemela en vez de fallar.
 *
 * El `findFirst` que valida "¿ya hay una pendiente?" es un check-then-act: dos
 * peticiones concurrentes leen las dos "no hay" antes de que cualquiera
 * inserte. El índice parcial cierra esa ventana, pero sin este manejo la
 * petición perdedora recibiría un P2002 crudo. El usuario hizo un solo clic y
 * su solicitud existe, así que lo correcto es devolvérsela.
 *
 * `wasDuplicate` le dice al llamador que debe salir sin notificar: la
 * notificación (in-app y de WhatsApp) ya la disparó la petición ganadora, y
 * mandarla dos veces es justo el síntoma que se está corrigiendo.
 */
export async function createOrReturnTwin<T>(params: {
  /** Nombre del índice parcial que protege la unicidad. */
  constraint: string;
  create: () => Promise<T>;
  /** Busca la solicitud pendiente gemela, con el mismo `include` que `create`. */
  findTwin: () => Promise<T | null>;
}): Promise<{ request: T; wasDuplicate: boolean }> {
  try {
    return { request: await params.create(), wasDuplicate: false };
  } catch (error) {
    if (!isUniqueViolationOn(error, params.constraint)) throw error;

    const twin = await params.findTwin();

    // Chocamos contra el índice, así que la gemela existe; si no se ve todavía
    // es que su transacción no ha terminado de confirmarse. Reintentar el
    // insert crearía el duplicado que el índice existe para evitar.
    if (!twin) throw error;

    return { request: twin, wasDuplicate: true };
  }
}
