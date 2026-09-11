import type {
  SqlDriverAdapter,
  SqlDriverAdapterFactory,
  SqlQuery,
  SqlResultSet,
  Transaction,
} from '@prisma/driver-adapter-utils';
import { Prisma, PrismaClient } from '../generated/prisma';
import { changedFieldsOf, toAuditLog, withAuditLog } from './audit-log.extension';
import { auditRecordIdExtension } from './audit-record-id.extension';

/**
 * Driver adapter falso con un pool de conexiones acotado, para correr el runtime
 * real de Prisma sin base de datos. Una transacción retiene su conexión hasta el
 * commit o rollback y cada consulta suelta toma una mientras dura: exactamente la
 * contención que ahogaba el pool real cuando la auditoría escribía fuera de la
 * transacción.
 */
const TEXT = 7;
const DATETIME = 10;

interface Statement {
  connection: string;
  sql: string;
  args: unknown[];
}

type FakeRow = Record<string, string>;

class FakeDatabase {
  readonly statements: Statement[] = [];
  readonly tables: Record<string, FakeRow[]> = {};
  private free: number;
  private readonly waiting: Array<() => void> = [];
  private transactions = 0;

  constructor(poolSize: number) {
    this.free = poolSize;
  }

  factory(): SqlDriverAdapterFactory {
    const adapter: SqlDriverAdapter = {
      provider: 'postgres',
      adapterName: 'fake-pool',
      queryRaw: (query) => this.withConnection((conn) => this.select(conn, query)),
      executeRaw: (query) => this.withConnection((conn) => this.execute(conn, query)),
      executeScript: async () => undefined,
      startTransaction: () => this.startTransaction(),
      getConnectionInfo: () => ({ schemaName: 'public', supportsRelationJoins: true }),
      dispose: async () => undefined,
    };
    return { provider: 'postgres', adapterName: 'fake-pool', connect: async () => adapter };
  }

  auditInserts(): Statement[] {
    return this.statements.filter(
      (s) => s.sql.startsWith('INSERT') && s.sql.includes('"audit_logs"'),
    );
  }

  private async acquire(): Promise<() => void> {
    if (this.free > 0) this.free--;
    else await new Promise<void>((resolve) => this.waiting.push(resolve));
    let released = false;
    return () => {
      if (released) return;
      released = true;
      const next = this.waiting.shift();
      if (next) next();
      else this.free++;
    };
  }

  private async withConnection<T>(run: (conn: string) => T): Promise<T> {
    const release = await this.acquire();
    try {
      return run('autocommit');
    } finally {
      release();
    }
  }

  private async startTransaction(): Promise<Transaction> {
    const release = await this.acquire();
    const conn = `tx${++this.transactions}`;
    this.statements.push({ connection: conn, sql: 'BEGIN', args: [] });
    // Como en el adapter de pg: con `usePhantomQuery: false` Prisma manda el
    // COMMIT/ROLLBACK por `executeRaw`, y commit()/rollback() solo sueltan la conexión.
    const end = async () => release();
    return {
      provider: 'postgres',
      adapterName: 'fake-pool',
      options: { usePhantomQuery: false },
      queryRaw: async (query) => this.select(conn, query),
      executeRaw: async (query) => this.execute(conn, query),
      commit: end,
      rollback: end,
    };
  }

  /** Devuelve todas las filas de la tabla, con las columnas que pida el SELECT. */
  private select(connection: string, query: SqlQuery): SqlResultSet {
    this.statements.push({ connection, sql: query.sql, args: query.args });
    const table = query.sql.match(/FROM\s+"\w+"\."(\w+)"/)?.[1];
    const selectList = query.sql.match(/^SELECT\s+(.*?)\s+FROM\s/s)?.[1];
    if (!query.sql.startsWith('SELECT') || !table || !selectList) {
      return { columnNames: [], columnTypes: [], rows: [] };
    }
    const columnNames = selectList
      .split(/,\s*/)
      .map((column) => [...column.matchAll(/"([^"]+)"/g)].pop()?.[1] ?? column);
    const rows = this.tables[table] ?? [];
    return {
      columnNames,
      columnTypes: columnNames.map((name) => (name.endsWith('_at') ? DATETIME : TEXT)),
      rows: rows.map((row) => columnNames.map((name) => row[name] ?? null)),
    };
  }

  private execute(connection: string, query: SqlQuery): number {
    this.statements.push({ connection, sql: query.sql, args: query.args });
    return 1;
  }
}

const AREAS = [
  { orderItemId: 'item-1', productionAreaId: 'area-1', assigned_at: '2026-09-10T12:00:00+00:00' },
  { orderItemId: 'item-1', productionAreaId: 'area-2', assigned_at: '2026-09-10T12:00:00+00:00' },
];

function setup(poolSize: number) {
  const db = new FakeDatabase(poolSize);
  db.tables.order_item_production_areas = AREAS;
  const client = new PrismaClient({
    adapter: db.factory(),
    transactionOptions: { maxWait: 1000, timeout: 1000 },
  });
  const prisma = withAuditLog(client.$extends(auditRecordIdExtension), {
    getContext: () => ({ userId: 'user-1' }),
  });
  const removeAreas = (tx: Pick<typeof prisma, 'orderItemProductionArea'>) =>
    tx.orderItemProductionArea.deleteMany({ where: { orderItemId: 'item-1' } });
  return { db, client, prisma, removeAreas };
}

describe('withAuditLog', () => {
  it('completes an audited interactive transaction with a single-connection pool', async () => {
    // Con la librería anterior la pre-lectura pedía una segunda conexión y esto
    // se quedaba esperando hasta el timeout de la transacción.
    const { db, client, prisma, removeAreas } = setup(1);

    await expect(prisma.$transaction((tx) => removeAreas(tx))).resolves.toEqual({ count: 1 });

    const preRead = db.statements.find((s) => s.sql.startsWith('SELECT'));
    expect(preRead?.connection).toBe('tx1');
    await client.$disconnect();
  });

  it('does not starve the pool with more concurrent transactions than connections', async () => {
    const { db, client, prisma, removeAreas } = setup(3);

    const results = await Promise.allSettled(
      Array.from({ length: 6 }, () => prisma.$transaction((tx) => removeAreas(tx))),
    );

    expect(results.map((r) => r.status)).toEqual(Array(6).fill('fulfilled'));
    expect(db.auditInserts()).toHaveLength(6);
    await client.$disconnect();
  });

  it('writes the logs of a transaction in one insert, after the commit', async () => {
    const { db, client, prisma, removeAreas } = setup(1);

    await prisma.$transaction(async (tx) => {
      await removeAreas(tx);
      await removeAreas(tx);
    });

    const [insert, ...others] = db.auditInserts();
    expect(others).toHaveLength(0);
    // Prisma envuelve el createMany en una transacción propia y corta; lo que
    // importa es que no vaya por la conexión de la transacción de negocio.
    expect(insert.connection).not.toBe('tx1');
    const commit = db.statements.findIndex((s) => s.connection === 'tx1' && s.sql === 'COMMIT');
    expect(commit).toBeGreaterThan(-1);
    expect(db.statements.indexOf(insert)).toBeGreaterThan(commit);
    // 2 filas por cada deleteMany; el recordId de la llave compuesta ya resuelto.
    expect(insert.args.filter((arg) => arg === 'DELETE')).toHaveLength(4);
    expect(insert.args).toEqual(
      expect.arrayContaining(['item-1:area-1', 'item-1:area-2', 'user-1']),
    );
    await client.$disconnect();
  });

  it('discards the logs of a transaction that rolls back', async () => {
    const { db, client, prisma, removeAreas } = setup(1);

    await expect(
      prisma.$transaction(async (tx) => {
        await removeAreas(tx);
        throw new Error('boom');
      }),
    ).rejects.toThrow('boom');

    expect(db.statements.some((s) => s.sql === 'ROLLBACK')).toBe(true);
    expect(db.auditInserts()).toHaveLength(0);
    await client.$disconnect();
  });

  it('keeps the logs of concurrent transactions apart', async () => {
    const { db, client, prisma, removeAreas } = setup(2);

    const [committed, rolledBack] = await Promise.allSettled([
      prisma.$transaction((tx) => removeAreas(tx)),
      prisma.$transaction(async (tx) => {
        await removeAreas(tx);
        throw new Error('boom');
      }),
    ]);

    expect(committed.status).toBe('fulfilled');
    expect(rolledBack.status).toBe('rejected');
    const [insert, ...others] = db.auditInserts();
    expect(others).toHaveLength(0);
    expect(insert.args.filter((arg) => arg === 'DELETE')).toHaveLength(2);
    await client.$disconnect();
  });

  it('writes the logs right away outside a transaction', async () => {
    const { db, client, prisma, removeAreas } = setup(1);

    await removeAreas(prisma);

    const [insert, ...others] = db.auditInserts();
    expect(others).toHaveLength(0);
    // La pre-lectura y el DELETE van sueltos; la única transacción es la que
    // Prisma abre para el createMany del log.
    const business = db.statements.filter((s) => !s.sql.includes('"audit_logs"'));
    expect(business.filter((s) => s.sql.startsWith('SELECT') || s.sql.startsWith('DELETE'))).toEqual([
      expect.objectContaining({ connection: 'autocommit', sql: expect.stringMatching(/^SELECT/) }),
      expect.objectContaining({ connection: 'autocommit', sql: expect.stringMatching(/^DELETE/) }),
    ]);
    const begins = db.statements.filter((s) => s.sql === 'BEGIN');
    expect(begins.map((s) => s.connection)).toEqual([insert.connection]);
    await client.$disconnect();
  });

  it('does not audit reads', async () => {
    const { db, client, prisma } = setup(1);

    await prisma.orderItemProductionArea.findMany();

    expect(db.statements).toHaveLength(1);
    expect(db.auditInserts()).toHaveLength(0);
    await client.$disconnect();
  });
});

describe('changedFieldsOf', () => {
  it('lists the fields whose value changed', () => {
    expect(changedFieldsOf({ a: 1, b: 'x', c: null }, { a: 2, b: 'x', c: null })).toEqual(['a']);
  });

  it('ignores a change of only the update timestamp', () => {
    expect(changedFieldsOf({ updatedAt: 'ayer' }, { updatedAt: 'hoy' })).toEqual([]);
    expect(changedFieldsOf({ updated_at: 'ayer' }, { updated_at: 'hoy' })).toEqual([]);
  });

  it('keeps the timestamp when something else changed too', () => {
    expect(changedFieldsOf({ a: 1, updatedAt: 'ayer' }, { a: 2, updatedAt: 'hoy' })).toEqual([
      'a',
      'updatedAt',
    ]);
  });
});

describe('toAuditLog', () => {
  it('masks fields at any depth and serializes dates and decimals', () => {
    const log = toAuditLog(
      {
        action: 'CREATE',
        model: 'Payment',
        recordId: 'p-1',
        newData: {
          amount: new Prisma.Decimal('19.50'),
          paidAt: new Date('2026-09-10T12:00:00.000Z'),
          nested: { password: 'secreto' },
        },
      },
      { maskFields: ['password'] },
    );

    expect(log.newData).toEqual({
      amount: '19.5',
      paidAt: '2026-09-10T12:00:00.000Z',
      nested: { password: '[REDACTED]' },
    });
  });

  it('applies the field filters of the model to the data and the changed fields', () => {
    const log = toAuditLog(
      {
        action: 'UPDATE',
        model: 'User',
        recordId: 'u-1',
        oldData: { email: 'a@x.co', password: 'viejo' },
        newData: { email: 'b@x.co', password: 'nuevo' },
        changedFields: ['email', 'password'],
      },
      { fieldFilters: { User: { exclude: ['password'] } } },
    );

    expect(log.oldData).toEqual({ email: 'a@x.co' });
    expect(log.newData).toEqual({ email: 'b@x.co' });
    expect(log.changedFields).toEqual(['email']);
  });

  it('merges the request context', () => {
    const log = toAuditLog(
      { action: 'DELETE', model: 'Order', recordId: 'o-1', oldData: {} },
      {
        getContext: () => ({ userId: 'user-1', metadata: { userAgent: 'jest', password: 'x' } }),
        maskFields: ['password'],
      },
    );

    expect(log).toMatchObject({
      userId: 'user-1',
      metadata: { userAgent: 'jest', password: '[REDACTED]' },
    });
  });
});
