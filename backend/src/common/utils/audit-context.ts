import { AsyncLocalStorage } from 'async_hooks';
import { Request } from 'express';

export interface AuditContext {
  userId?: string;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Contexto de auditoría por request, guardado en AsyncLocalStorage.
 *
 * Cada request HTTP tiene su propio objeto y lo conserva a través de todos los
 * `await` del handler, incluidas las transacciones de Prisma. Antes era una
 * variable global del módulo: los requests concurrentes se la pisaban y los
 * logs de auditoría quedaban sin usuario o a nombre de otro.
 *
 * Fuera de un request (crons, listeners, gateways) no hay contexto y todos los
 * campos quedan undefined, que es lo correcto: esas escrituras no tienen autor.
 */
const storage = new AsyncLocalStorage<AuditContext>();

/**
 * Obtiene el contexto actual para los registros de auditoría
 */
export function getAuditContext(): AuditContext {
  const store = storage.getStore();
  return {
    userId: store?.userId,
    ipAddress: store?.ipAddress,
    userAgent: store?.userAgent,
  };
}

/**
 * Arma el contexto inicial (IP y User-Agent) desde una solicitud HTTP
 */
export function buildAuditContextFromRequest(req: Request): AuditContext {
  return {
    ipAddress:
      (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() ||
      req.socket?.remoteAddress ||
      'unknown',
    userAgent: req.headers['user-agent'] || 'unknown',
  };
}

/**
 * Ejecuta `fn` (y todo lo asíncrono que dispare) dentro de `context`
 */
export function runWithAuditContext<T>(context: AuditContext, fn: () => T): T {
  return storage.run(context, fn);
}

/**
 * Completa el usuario del request en curso. El contexto se abre antes de los
 * guards y el usuario autenticado solo existe después, por eso va aparte.
 * Sin contexto activo no hace nada.
 */
export function setAuditUserId(userId: string | undefined): void {
  const store = storage.getStore();
  if (store) {
    store.userId = userId;
  }
}
