import { Prisma } from '../generated/prisma';

/**
 * Modelos con llave primaria compuesta (`@@id([...])` en schema.prisma).
 *
 * `@explita/prisma-audit-log` arma el `recordId` con `record.id`. Estos modelos
 * no tienen `id`: en delete/deleteMany/update el log se descartaba, porque
 * `AuditLog.recordId` es obligatorio, y en createMany quedaba como 'unknown'.
 *
 * El spec compara esta tabla con schema.prisma, así que un `@@id` nuevo que no
 * se registre aquí hace fallar los tests.
 */
export const COMPOSITE_PRIMARY_KEYS: Readonly<Record<string, readonly string[]>> = {
  RolePermission: ['roleId', 'permissionId'],
  QuoteItemProductionArea: ['quoteItemId', 'productionAreaId'],
  OrderItemProductionArea: ['orderItemId', 'productionAreaId'],
  WorkOrderItemProductionArea: ['workOrderItemId', 'productionAreaId'],
  ExpenseOrderItemProductionArea: ['expenseOrderItemId', 'productionAreaId'],
};

export const UNKNOWN_RECORD_ID = 'unknown';

type AuditLogDraft = {
  model?: unknown;
  recordId?: unknown;
  oldData?: unknown;
  newData?: unknown;
};

function asObject(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
}

/**
 * `recordId` de un log de auditoría: el que trae la librería si es real; si no,
 * la llave compuesta (`orderItemId:productionAreaId`) sacada del snapshot; y como
 * último recurso 'unknown', que al menos deja el log guardado en vez de perderlo.
 */
export function resolveAuditRecordId(log: AuditLogDraft): string {
  if (log.recordId != null && log.recordId !== UNKNOWN_RECORD_ID) {
    return String(log.recordId);
  }

  const keys = typeof log.model === 'string' ? COMPOSITE_PRIMARY_KEYS[log.model] : undefined;
  if (keys) {
    // DELETE solo trae oldData y CREATE solo newData; UPDATE trae los campos cambiados.
    const snapshot = { ...asObject(log.newData), ...asObject(log.oldData) };
    if (keys.every((key) => snapshot[key] != null)) {
      return keys.map((key) => String(snapshot[key])).join(':');
    }
  }

  return UNKNOWN_RECORD_ID;
}

export function withResolvedRecordIds<T extends AuditLogDraft>(
  data: T | T[],
): (T & { recordId: string })[] {
  const rows = Array.isArray(data) ? data : [data];
  return rows.map((row) => ({ ...row, recordId: resolveAuditRecordId(row) }));
}

/**
 * Completa el `recordId` antes de que Prisma valide el `auditLog.createMany`.
 *
 * Tiene que aplicarse *debajo* de `auditLogExtension`: la librería escribe los
 * logs con el cliente que extiende, y solo así esa escritura pasa por aquí.
 */
export const auditRecordIdExtension = Prisma.defineExtension({
  name: 'auditRecordIdFallback',
  query: {
    auditLog: {
      createMany({ args, query }) {
        return query({ ...args, data: withResolvedRecordIds(args.data) });
      },
    },
  },
});
