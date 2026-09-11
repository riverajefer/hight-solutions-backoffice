import { Logger } from '@nestjs/common';
import { Prisma } from '../generated/prisma';
import { COMPOSITE_PRIMARY_KEYS } from './audit-record-id.extension';

/**
 * Auditoría automática de escrituras en `audit_logs`.
 *
 * Reemplaza a `@explita/prisma-audit-log` 0.2.1, que hacía la pre-lectura y el
 * `auditLog.createMany` con el cliente base, *fuera* de la transacción
 * interactiva. Eso tenía dos consecuencias:
 *  - Cada transacción que tocaba un modelo auditado pedía una segunda conexión
 *    al pool sin soltar la suya. Con tantas transacciones concurrentes como
 *    conexiones tiene el pool, todas esperaban hasta el timeout (500 y rollback).
 *  - Los logs sobrevivían al rollback: `audit_logs` registraba operaciones que
 *    nunca ocurrieron.
 *
 * Aquí, dentro de una transacción interactiva, las lecturas van por el cliente
 * de la transacción y los logs se acumulan en un buffer que se escribe solo
 * después del commit. Si hay rollback, se descartan. Fuera de una transacción
 * se escriben al momento, como antes.
 *
 * Si el proceso muere justo entre el commit y la escritura, esos logs se
 * pierden. Es el costo elegido: preferimos un dato sin log a un log sin dato,
 * y que un fallo de auditoría nunca tumbe la operación de negocio.
 */

type Row = Record<string, unknown>;
type Query = (args: unknown) => Promise<unknown>;
type AuditAction = 'CREATE' | 'UPDATE' | 'DELETE' | 'CREATE_upsert' | 'UPDATE_upsert';

export interface AuditLogDraft {
  action: AuditAction;
  model: string;
  /** Sin id propio queda undefined y lo resuelve `auditRecordIdExtension`. */
  recordId: string | undefined;
  oldData?: Row;
  newData?: Row;
  changedFields?: string[];
}

export interface FieldFilter {
  include?: string[];
  exclude?: string[];
}

export interface AuditLogOptions {
  /** Campos extra del log (userId, ipAddress, metadata...). */
  getContext?: () => Row | undefined;
  /** Claves a enmascarar en oldData/newData/metadata, a cualquier profundidad. */
  maskFields?: string[];
  maskValue?: unknown;
  fieldFilters?: Record<string, FieldFilter>;
  /** Se llama con los logs ya guardados. */
  logger?: (logs: Row[]) => void | Promise<void>;
  skip?: (params: { model: string; operation: string; args: unknown }) => boolean | Promise<boolean>;
}

/** Símbolo con el que Prisma expone el id de la transacción en el cliente `tx`. */
const TRANSACTION_ID = Symbol.for('prisma.client.transaction.id');

const AUDITED_OPERATIONS = new Set([
  'create',
  'createMany',
  'createManyAndReturn',
  'delete',
  'deleteMany',
  'update',
  'updateMany',
  'updateManyAndReturn',
  'upsert',
]);

const logger = new Logger('AuditLog');

interface Delegate {
  findMany(args: unknown): Promise<Row[]>;
  findUnique(args: unknown): Promise<Row | null>;
}

interface AuditLogWriter {
  auditLog: { createMany(args: { data: Row[] }): Promise<unknown> };
}

interface AuditableClient {
  $extends(extension: unknown): AuditableClient;
  $transaction(input: unknown, options?: unknown): Promise<unknown>;
}

interface PendingTransaction {
  tx: unknown;
  logs: Row[];
}

/** `transaction` que Prisma pasa a las extensiones de query en `__internalParams`. */
interface InternalParams {
  transaction?: { kind: string; id?: string };
}

interface HandlerContext {
  model: string;
  args: Row;
  query: Query;
  /** Cliente para las lecturas: el de la transacción si la operación va en una. */
  reader: unknown;
  save(drafts: AuditLogDraft[]): Promise<void>;
}

function delegate(client: unknown, model: string): Delegate {
  const name = model.charAt(0).toLowerCase() + model.slice(1);
  return (client as Record<string, Delegate>)[name];
}

function recordIdOf(model: string, row: Row | null | undefined): string | undefined {
  if (!row) return undefined;
  if (row.id != null) return String(row.id);
  const keys = COMPOSITE_PRIMARY_KEYS[model];
  if (keys?.every((key) => row[key] != null)) {
    return keys.map((key) => String(row[key])).join(':');
  }
  return undefined;
}

function keyWhere(model: string, rows: Row[]): Row {
  const keys = COMPOSITE_PRIMARY_KEYS[model];
  if (!keys) return { id: { in: rows.map((row) => row.id) } };
  return { OR: rows.map((row) => Object.fromEntries(keys.map((key) => [key, row[key]]))) };
}

/**
 * Campos que cambiaron entre dos versiones de una fila. Vacío si no cambió nada
 * o si solo cambió el timestamp de actualización, que no merece un log.
 */
export function changedFieldsOf(before: Row, after: Row): string[] {
  const changed = Object.keys(after).filter(
    (key) => JSON.stringify(before[key]) !== JSON.stringify(after[key]),
  );
  const onlyTimestamp =
    changed.length === 1 && (changed[0] === 'updatedAt' || changed[0] === 'updated_at');
  return onlyTimestamp ? [] : changed;
}

function pick(row: Row, fields: string[]): Row {
  return Object.fromEntries(fields.map((field) => [field, row[field]]));
}

function keepsField(field: string, filter: FieldFilter): boolean {
  if (filter.include?.length) return filter.include.includes(field);
  if (filter.exclude?.length) return !filter.exclude.includes(field);
  return true;
}

function filterFields(data: Row, filter: FieldFilter): Row {
  return Object.fromEntries(Object.entries(data).filter(([key]) => keepsField(key, filter)));
}

function sanitize(value: unknown, options: AuditLogOptions, key?: string): unknown {
  if (key && options.maskFields?.includes(key)) return options.maskValue ?? '[REDACTED]';
  if (value == null) return value;
  if (value instanceof Date) return value.toISOString();
  if (Prisma.Decimal.isDecimal(value)) return value.toString();
  if (Array.isArray(value)) return value.map((item) => sanitize(item, options));
  if (typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([k, v]) => [k, sanitize(v, options, k)]),
    );
  }
  return value;
}

/** Fila lista para `audit_logs`: filtros por modelo, contexto del request y máscaras. */
export function toAuditLog(draft: AuditLogDraft, options: AuditLogOptions): Row {
  const filter = options.fieldFilters?.[draft.model];
  const log: Row = {
    ...draft,
    oldData: draft.oldData && filter ? filterFields(draft.oldData, filter) : draft.oldData,
    newData: draft.newData && filter ? filterFields(draft.newData, filter) : draft.newData,
    changedFields:
      draft.changedFields && filter
        ? draft.changedFields.filter((field) => keepsField(field, filter))
        : draft.changedFields,
    ...options.getContext?.(),
  };
  for (const key of ['oldData', 'newData', 'metadata']) {
    if (log[key]) log[key] = sanitize(log[key], options);
  }
  return log;
}

async function writeAuditLogs(
  writer: AuditLogWriter,
  logs: Row[],
  options: AuditLogOptions,
): Promise<void> {
  if (!logs.length) return;
  try {
    await writer.auditLog.createMany({ data: logs });
    await options.logger?.(logs);
  } catch (error) {
    // La operación ya está hecha: un fallo de auditoría no debe devolverle un error al usuario.
    logger.error(`No se pudieron guardar ${logs.length} registros de auditoría`, error as Error);
  }
}

async function handleCreate(ctx: HandlerContext, action: AuditAction = 'CREATE') {
  const result = (await ctx.query(ctx.args)) as Row;
  await ctx.save([
    { action, model: ctx.model, recordId: recordIdOf(ctx.model, result), newData: result },
  ]);
  return result;
}

async function handleCreateMany(ctx: HandlerContext, returning: boolean) {
  if (returning) {
    const rows = (await ctx.query(ctx.args)) as Row[];
    await ctx.save(
      rows.map((row) => ({
        action: 'CREATE' as const,
        model: ctx.model,
        recordId: recordIdOf(ctx.model, row),
        newData: row,
      })),
    );
    return rows;
  }

  // createMany no devuelve las filas: el log sale de los datos de entrada.
  const data = ctx.args.data;
  const items = (Array.isArray(data) ? data : data ? [data] : []) as Row[];
  const result = await ctx.query(ctx.args);
  await ctx.save(
    items.map((item) => ({
      action: 'CREATE' as const,
      model: ctx.model,
      recordId: recordIdOf(ctx.model, item),
      newData: item,
    })),
  );
  return result;
}

async function handleDelete(ctx: HandlerContext) {
  const current = await delegate(ctx.reader, ctx.model).findUnique({ where: ctx.args.where });
  const result = await ctx.query(ctx.args);
  if (current) {
    await ctx.save([
      { action: 'DELETE', model: ctx.model, recordId: recordIdOf(ctx.model, current), oldData: current },
    ]);
  }
  return result;
}

async function handleDeleteMany(ctx: HandlerContext) {
  const current = await delegate(ctx.reader, ctx.model).findMany({ where: ctx.args.where });
  const result = await ctx.query(ctx.args);
  await ctx.save(
    current.map((row) => ({
      action: 'DELETE' as const,
      model: ctx.model,
      recordId: recordIdOf(ctx.model, row),
      oldData: row,
    })),
  );
  return result;
}

function updateDraft(
  model: string,
  before: Row,
  after: Row,
  action: AuditAction = 'UPDATE',
): AuditLogDraft | undefined {
  const changedFields = changedFieldsOf(before, after);
  if (!changedFields.length) return undefined;
  return {
    action,
    model,
    recordId: recordIdOf(model, after),
    oldData: pick(before, changedFields),
    newData: pick(after, changedFields),
    changedFields,
  };
}

async function handleUpdate(ctx: HandlerContext, existing?: Row, action: AuditAction = 'UPDATE') {
  const current =
    existing ?? (await delegate(ctx.reader, ctx.model).findUnique({ where: ctx.args.where }));
  const result = (await ctx.query(ctx.args)) as Row;
  const draft = current ? updateDraft(ctx.model, current, result, action) : undefined;
  if (draft) await ctx.save([draft]);
  return result;
}

async function handleUpdateMany(ctx: HandlerContext, returning: boolean) {
  const reader = delegate(ctx.reader, ctx.model);
  const current = await reader.findMany({ where: ctx.args.where });
  const result = await ctx.query(ctx.args);
  if (!current.length) return result;

  const updated = returning
    ? (result as Row[])
    : await reader.findMany({ where: keyWhere(ctx.model, current) });
  const byKey = new Map(updated.map((row) => [recordIdOf(ctx.model, row), row]));
  const drafts = current.flatMap((before) => {
    const after = byKey.get(recordIdOf(ctx.model, before));
    const draft = after ? updateDraft(ctx.model, before, after) : undefined;
    return draft ? [draft] : [];
  });
  await ctx.save(drafts);
  return result;
}

async function handleUpsert(ctx: HandlerContext) {
  const existing = await delegate(ctx.reader, ctx.model).findUnique({ where: ctx.args.where });
  return existing
    ? handleUpdate(ctx, existing, 'UPDATE_upsert')
    : handleCreate(ctx, 'CREATE_upsert');
}

function handle(operation: string, ctx: HandlerContext): Promise<unknown> {
  switch (operation) {
    case 'create':
      return handleCreate(ctx);
    case 'createMany':
    case 'createManyAndReturn':
      return handleCreateMany(ctx, operation === 'createManyAndReturn');
    case 'delete':
      return handleDelete(ctx);
    case 'deleteMany':
      return handleDeleteMany(ctx);
    case 'update':
      return handleUpdate(ctx);
    case 'updateMany':
    case 'updateManyAndReturn':
      return handleUpdateMany(ctx, operation === 'updateManyAndReturn');
    default:
      return handleUpsert(ctx);
  }
}

function auditLogExtension(
  client: AuditLogWriter,
  options: AuditLogOptions,
  pending: Map<string, PendingTransaction>,
) {
  return Prisma.defineExtension({
    name: 'auditLog',
    query: {
      $allModels: {
        async $allOperations(params) {
          const { model, operation, args, query } = params;
          if (!AUDITED_OPERATIONS.has(operation) || model === 'AuditLog') return query(args);
          if (await options.skip?.({ model, operation, args })) return query(args);

          // Prisma no tipa `__internalParams` en las operaciones de modelo, pero es
          // lo único que dice si la operación va dentro de una transacción.
          const { transaction } = (params as unknown as { __internalParams?: InternalParams })
            .__internalParams ?? {};
          const inTransaction =
            transaction?.kind === 'itx' && transaction.id ? pending.get(transaction.id) : undefined;

          // Sin transacción registrada (operación suelta o transacción por lotes)
          // se lee con el cliente base y se escribe al momento.
          return handle(operation, {
            model,
            args: args as Row,
            query: query as Query,
            reader: inTransaction ? inTransaction.tx : client,
            save: async (drafts) => {
              const logs = drafts.map((draft) => toAuditLog(draft, options));
              if (inTransaction) inTransaction.logs.push(...logs);
              else await writeAuditLogs(client, logs, options);
            },
          });
        },
      },
    },
  });
}

/**
 * Aplica la auditoría a `client` y envuelve `$transaction` para que los logs
 * de una transacción interactiva se escriban después del commit.
 *
 * Los logs se escriben con `client`, así que las extensiones que tenga debajo
 * (como `auditRecordIdExtension`) también pasan por esas escrituras.
 */
export function withAuditLog<T extends object>(client: T, options: AuditLogOptions): T {
  const base = client as unknown as AuditableClient & AuditLogWriter;
  const pending = new Map<string, PendingTransaction>();
  const extended = base.$extends(auditLogExtension(base, options, pending));
  const transaction = extended.$transaction.bind(extended);

  const take = (id: string | undefined) => {
    const entry = id ? pending.get(id) : undefined;
    if (id) pending.delete(id);
    return entry?.logs ?? [];
  };

  Object.assign(extended, {
    $transaction(input: unknown, txOptions?: unknown) {
      // Las transacciones por lotes (`$transaction([...])`) no se tocan.
      if (typeof input !== 'function') return transaction(input, txOptions);

      let id: string | undefined;
      return transaction(async (tx: Record<symbol, string | undefined>) => {
        id = tx[TRANSACTION_ID];
        if (id) pending.set(id, { tx, logs: [] });
        return input(tx);
      }, txOptions).then(
        async (result) => {
          await writeAuditLogs(base, take(id), options);
          return result;
        },
        (error: unknown) => {
          take(id);
          throw error;
        },
      );
    },
  });

  return extended as unknown as T;
}
