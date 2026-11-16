import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { MaterialConsumptionSource, OrderStatus, Prisma, SupplyLotStatus } from '../../generated/prisma';
import { PrismaService } from '../../database/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { SupplyLotsRepository } from '../supply-lots/supply-lots.repository';
import { MaterialConsumptionService } from './material-consumption.service';

/**
 * Base en memoria con solo lo que usa el motor. Los tests unitarios del repo
 * mockean Prisma llamada por llamada; aquí eso no sirve, porque lo que importa
 * es el estado final (saldos, filas de consumo, kardex) tras una secuencia.
 */
const D = (n: number | string | Prisma.Decimal) => new Prisma.Decimal(n);

interface Lot {
  id: string; code: string; supplyId: string; status: SupplyLotStatus; remainingQuantity: Prisma.Decimal;
  lowStockQuantity: Prisma.Decimal; unitCost: Prisma.Decimal; wasteQuantity: Prisma.Decimal;
  receivedAt: Date; sequence: number; depletedAt?: Date | null;
}
interface Row {
  id: string; orderId: string; orderItemId: string | null; supplyId: string; lotId: string | null;
  quantity: Prisma.Decimal; unitCost: Prisma.Decimal | null; totalCost: Prisma.Decimal | null;
  source: MaterialConsumptionSource; factor: Prisma.Decimal | null; createdAt: Date;
}
interface Rule {
  productId: string; supplyId: string; factor: Prisma.Decimal; isActive: boolean; autoConsume: boolean;
  effectiveFrom: Date;
}
interface Supply {
  id: string; name: string; currentStock: Prisma.Decimal; trackLots: boolean; isActive: boolean;
  consumptionUnitId: string;
}
interface Override { orderItemId: string; supplyId: string; quantity: Prisma.Decimal; note: string | null }

const RULE_START = new Date(2026, 0, 1);
const ITEM_DATE = new Date(2026, 10, 14);

function makeDb() {
  let seq = 0;
  const id = (p: string) => `${p}-${++seq}`;
  const mkSupply = (sid: string, name: string, unit = 'm'): Supply =>
    ({ id: sid, name, currentStock: D(0), trackLots: true, isActive: true, consumptionUnitId: unit });
  const supplies: Record<string, Supply> = { 's-uv': mkSupply('s-uv', 'Rollo DTF UV') };
  const db = {
    order: { id: 'op-1', orderNumber: 'OP-1', status: OrderStatus.DRAFT as OrderStatus, createdById: 'u1',
      items: [] as { id: string; productId: string | null; quantity: Prisma.Decimal; createdAt: Date }[] },
    rules: [
      { productId: 'p-dtf', supplyId: 's-uv', factor: D(1), isActive: true, autoConsume: true, effectiveFrom: RULE_START },
    ] as Rule[],
    supplies,
    supply: supplies['s-uv'],
    overrides: [] as Override[],
    lots: [] as Lot[],
    rows: [] as Row[],
    movements: [] as { type: string; quantity: Prisma.Decimal; lotId: string; reason: string }[],
  };
  const matchRow = (r: Row, w: Record<string, unknown>) =>
    Object.entries(w).every(([k, v]) => (r as unknown as Record<string, unknown>)[k] === v);
  const tx = {
    $queryRaw: jest.fn(async () => [{ id: 's-uv', name: 'Rollo DTF UV', is_active: true, track_lots: true }]),
    order: { findUnique: jest.fn(async () => db.order) },
    orderItem: { findUnique: jest.fn(async () => ({ orderId: db.order.id })) },
    productSupplyRule: {
      findMany: jest.fn(async ({ where }: { where: { productId: { in: string[] } } }) =>
        db.rules
          .filter((r) => where.productId.in.includes(r.productId))
          .map((r) => ({ ...r, supply: db.supplies[r.supplyId] }))),
    },
    materialOverride: {
      findMany: jest.fn(async ({ where }: { where: { orderItemId?: { in: string[] }; orderItem?: unknown } }) =>
        db.overrides
          .filter((o) => !where.orderItemId || where.orderItemId.in.includes(o.orderItemId))
          .map((o) => ({ ...o, supply: { ...db.supplies[o.supplyId], consumptionUnit: { abbreviation: 'm' } }, createdBy: null }))),
      upsert: jest.fn(async ({ where, create, update }: {
        where: { orderItemId_supplyId: { orderItemId: string; supplyId: string } };
        create: Override; update: Partial<Override>;
      }) => {
        const k = where.orderItemId_supplyId;
        const found = db.overrides.find((o) => o.orderItemId === k.orderItemId && o.supplyId === k.supplyId);
        if (found) Object.assign(found, update);
        else db.overrides.push({ ...create, note: create.note ?? null });
      }),
      deleteMany: jest.fn(async ({ where }: { where: { orderItemId: string; supplyId: string } }) => {
        db.overrides = db.overrides.filter((o) => !(o.orderItemId === where.orderItemId && o.supplyId === where.supplyId));
      }),
    },
    supply: {
      findUnique: jest.fn(async ({ where }: { where: { id: string } }) => db.supplies[where.id] ?? null),
      update: jest.fn(async ({ where, data }: { where: { id: string }; data: { currentStock: { increment?: Prisma.Decimal; decrement?: Prisma.Decimal } } }) => {
        const s = db.supplies[where.id];
        const c = data.currentStock;
        s.currentStock = c.increment ? s.currentStock.add(c.increment) : s.currentStock.sub(c.decrement!);
        return { currentStock: s.currentStock };
      }),
    },
    supplyLot: {
      findMany: jest.fn(async ({ where }: { where: { supplyId: string } }) =>
        db.lots
          .filter((l) => l.supplyId === where.supplyId)
          .filter((l) => (l.status === SupplyLotStatus.AVAILABLE || l.status === SupplyLotStatus.IN_USE) && l.remainingQuantity.greaterThan(0))
          .sort((a, b) => a.receivedAt.getTime() - b.receivedAt.getTime())
          .map((l) => ({ ...l, supply: { name: db.supplies[l.supplyId].name } }))),
      findUnique: jest.fn(async ({ where }: { where: { id: string } }) => db.lots.find((l) => l.id === where.id)),
      findUniqueOrThrow: jest.fn(async ({ where }: { where: { id: string } }) => db.lots.find((l) => l.id === where.id)),
      update: jest.fn(async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
        const lot = db.lots.find((l) => l.id === where.id)!;
        for (const [k, v] of Object.entries(data)) {
          const val = v as { increment?: Prisma.Decimal };
          (lot as unknown as Record<string, unknown>)[k] =
            val && typeof val === 'object' && 'increment' in val ? D((lot as unknown as Record<string, Prisma.Decimal>)[k]).add(val.increment!) : v;
        }
        return lot;
      }),
    },
    materialConsumption: {
      findMany: jest.fn(async ({ where }: { where: Record<string, unknown> }) => db.rows.filter((r) => matchRow(r, where))),
      findFirst: jest.fn(async ({ where }: { where: Record<string, unknown> }) => db.rows.find((r) => matchRow(r, where)) ?? null),
      findUnique: jest.fn(async ({ where }: { where: { id: string } }) => {
        const r = db.rows.find((x) => x.id === where.id);
        return r ? { ...r, order: { orderNumber: db.order.orderNumber } } : null;
      }),
      create: jest.fn(async ({ data }: { data: Omit<Row, 'id' | 'createdAt'> }) => {
        const r = {
          ...data, unitCost: data.unitCost ?? null, totalCost: data.totalCost ?? null, factor: data.factor ?? null,
          id: id('c'), createdAt: new Date(Date.now() + seq), quantity: D(data.quantity),
        } as Row;
        db.rows.push(r);
        return { id: r.id };
      }),
      update: jest.fn(async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
        const r = db.rows.find((x) => x.id === where.id)!;
        for (const [k, v] of Object.entries(data)) {
          const val = v as { increment?: Prisma.Decimal };
          (r as unknown as Record<string, unknown>)[k] =
            val && typeof val === 'object' && 'increment' in val ? r.quantity.add(val.increment!) : v;
        }
        return { id: r.id };
      }),
      updateMany: jest.fn(async ({ where, data }: { where: Record<string, unknown>; data: Partial<Row> }) => {
        const ids = (where.id as { in?: string[] } | undefined)?.in;
        const { id: _id, ...rest } = where;
        db.rows
          .filter((r) => (ids ? ids.includes(r.id) : true) && matchRow(r, rest))
          .forEach((r) => Object.assign(r, data));
      }),
      aggregate: jest.fn(async ({ where }: { where: Record<string, unknown> }) => ({
        _sum: { quantity: db.rows.filter((r) => matchRow(r, where)).reduce((a, r) => a.add(r.quantity), D(0)) },
      })),
      delete: jest.fn(async ({ where }: { where: { id: string } }) => {
        db.rows = db.rows.filter((r) => r.id !== where.id);
      }),
      count: jest.fn(async ({ where }: { where: Record<string, unknown> }) => db.rows.filter((r) => matchRow(r, where)).length),
    },
    inventoryMovement: {
      create: jest.fn(async ({ data }: { data: { type: string; quantity: Prisma.Decimal; lotId: string; reason: string } }) => {
        db.movements.push(data);
      }),
    },
  };
  const addLot = (
    code: string, qty: number, cost: number, status: SupplyLotStatus = SupplyLotStatus.AVAILABLE, day = 1,
    supplyId = 's-uv',
  ) => {
    db.lots.push({
      id: code, code, supplyId, status, remainingQuantity: D(qty), lowStockQuantity: D(qty / 10),
      unitCost: D(cost), wasteQuantity: D(0), receivedAt: new Date(2026, 10, day), sequence: day,
    });
    db.supplies[supplyId].currentStock = db.supplies[supplyId].currentStock.add(qty);
  };
  const addSupply = (sid: string, name: string, unit = 'm') => {
    db.supplies[sid] = mkSupply(sid, name, unit);
  };
  return { db, tx, addLot, addSupply };
}

describe('MaterialConsumptionService', () => {
  let service: MaterialConsumptionService;
  let env: ReturnType<typeof makeDb>;
  const promoteNextLot = jest.fn(async () => null);

  const qtyOf = (lotId: string | null) =>
    env.db.rows.filter((r) => r.lotId === lotId).reduce((a, r) => a + Number(r.quantity), 0);
  const qtyOfSupply = (supplyId: string) =>
    env.db.rows.filter((r) => r.supplyId === supplyId).reduce((a, r) => a + Number(r.quantity), 0);
  const lot = (code: string) => env.db.lots.find((l) => l.code === code)!;
  const setItem = (qty: number, productId = 'p-dtf', createdAt = ITEM_DATE) => {
    env.db.order.items = [{ id: 'it-1', productId, quantity: D(qty), createdAt }];
  };

  beforeEach(async () => {
    env = makeDb();
    const prisma = { ...env.tx, $transaction: jest.fn((fn: (t: unknown) => unknown) => fn(env.tx)) };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MaterialConsumptionService,
        { provide: PrismaService, useValue: prisma },
        { provide: SupplyLotsRepository, useValue: { lockSupply: jest.fn(), promoteNextLot } },
        { provide: NotificationsService, useValue: { notifyUsersWithPermission: jest.fn().mockResolvedValue(undefined) } },
      ],
    }).compile();
    service = module.get(MaterialConsumptionService);
  });

  afterEach(() => jest.clearAllMocks());

  it('descuenta la cantidad del ítem del rollo, con su costo', async () => {
    env.addLot('ROL-1', 100, 100);
    setItem(1);
    await service.syncOrder('op-1');

    expect(qtyOf('ROL-1')).toBe(1);
    expect(Number(env.db.rows[0].totalCost)).toBe(100);
    expect(Number(lot('ROL-1').remainingQuantity)).toBe(99);
    expect(Number(env.db.supply.currentStock)).toBe(99);
    expect(env.db.movements.map((m) => m.type)).toEqual(['EXIT']);
  });

  it('es idempotente: sincronizar dos veces no descuenta dos veces', async () => {
    env.addLot('ROL-1', 100, 100);
    setItem(2.5);
    await service.syncOrder('op-1');
    await service.syncOrder('op-1');

    expect(qtyOf('ROL-1')).toBe(2.5);
    expect(env.db.movements).toHaveLength(1);
  });

  it('al editar la cantidad mueve solo la diferencia', async () => {
    env.addLot('ROL-1', 100, 100);
    setItem(2.5);
    await service.syncOrder('op-1');
    setItem(1);
    await service.syncOrder('op-1');

    expect(qtyOf('ROL-1')).toBe(1);
    expect(env.db.movements.map((m) => `${m.type}:${m.quantity}`)).toEqual(['EXIT:2.5', 'RETURN:1.5']);
    expect(Number(lot('ROL-1').remainingQuantity)).toBe(99);
  });

  it('toma primero del rollo en uso y parte el consumo con el siguiente por antigüedad', async () => {
    env.addLot('ROL-OLD', 5, 100, SupplyLotStatus.AVAILABLE, 1);
    env.addLot('ROL-USE', 3, 200, SupplyLotStatus.IN_USE, 2);
    setItem(4);
    await service.syncOrder('op-1');

    expect(qtyOf('ROL-USE')).toBe(3);
    expect(qtyOf('ROL-OLD')).toBe(1);
    expect(lot('ROL-USE').status).toBe(SupplyLotStatus.DEPLETED);
    expect(promoteNextLot).toHaveBeenCalledWith(expect.anything(), 's-uv');
  });

  it('sin saldo la venta pasa y el faltante queda pendiente, sin costo ni rollo en negativo', async () => {
    env.addLot('ROL-1', 1, 100);
    setItem(3);
    await service.syncOrder('op-1');

    expect(qtyOf('ROL-1')).toBe(1);
    expect(qtyOf(null)).toBe(2);
    expect(Number(lot('ROL-1').remainingQuantity)).toBe(0);
    expect(env.db.rows.find((r) => r.lotId === null)!.totalCost).toBeNull();
  });

  it('al bajar la cantidad libera primero lo pendiente', async () => {
    env.addLot('ROL-1', 1, 100);
    setItem(3);
    await service.syncOrder('op-1');
    setItem(1);
    await service.syncOrder('op-1');

    expect(qtyOf(null)).toBe(0);
    expect(qtyOf('ROL-1')).toBe(1);
  });

  it('una OP anulada devuelve todo, también lo corregido a mano', async () => {
    env.addLot('ROL-1', 100, 100);
    setItem(2);
    await service.syncOrder('op-1');
    await service.correctItem('it-1', 's-uv', 0.5, 'u1');
    env.db.order.status = OrderStatus.ANULADO;
    await service.syncOrder('op-1');

    expect(env.db.rows).toHaveLength(0);
    expect(Number(lot('ROL-1').remainingQuantity)).toBe(100);
  });

  it('una corrección manual no la pisa la sincronización al editar la OP', async () => {
    env.addLot('ROL-1', 100, 100);
    setItem(1300); // stickers vendidos por unidad
    env.addLot('ROL-2', 2000, 100, SupplyLotStatus.AVAILABLE, 3);
    await service.syncOrder('op-1');
    await service.correctItem('it-1', 's-uv', 0.8, 'u1');
    setItem(1400);
    await service.syncOrder('op-1');

    const total = env.db.rows.reduce((a, r) => a + Number(r.quantity), 0);
    expect(total).toBe(0.8);
    expect(env.db.rows.every((r) => r.source === MaterialConsumptionSource.MANUAL)).toBe(true);
  });

  it('un ítem borrado (fila huérfana) devuelve su material', async () => {
    env.addLot('ROL-1', 100, 100);
    setItem(2);
    await service.syncOrder('op-1');
    env.db.rows.forEach((r) => (r.orderItemId = null));
    env.db.order.items = [];
    await service.syncOrder('op-1');

    expect(env.db.rows).toHaveLength(0);
    expect(Number(lot('ROL-1').remainingQuantity)).toBe(100);
  });

  it('la devolución a un rollo cerrado sale como merma recuperada y no reabre el saldo', async () => {
    env.addLot('ROL-1', 10, 100);
    setItem(4);
    await service.syncOrder('op-1');
    Object.assign(lot('ROL-1'), { status: SupplyLotStatus.CLOSED, remainingQuantity: D(0), wasteQuantity: D(6) });
    env.db.order.status = OrderStatus.ANULADO;
    await service.syncOrder('op-1');

    expect(Number(lot('ROL-1').remainingQuantity)).toBe(0);
    expect(Number(lot('ROL-1').wasteQuantity)).toBe(10);
    expect(env.db.movements.slice(-2).map((m) => m.type)).toEqual(['RETURN', 'ADJUSTMENT']);
  });

  it('devolver a un rollo agotado por el sistema lo reabre: no es merma', async () => {
    env.addLot('ROL-1', 100, 100);
    setItem(200); // 200 stickers tomados como 200 m: agota el rollo en el papel
    await service.syncOrder('op-1');
    expect(lot('ROL-1').status).toBe(SupplyLotStatus.DEPLETED);

    await service.correctItem('it-1', 's-uv', 0.6, 'u1');

    expect(qtyOf(null)).toBe(0);
    expect(qtyOf('ROL-1')).toBe(0.6);
    expect(Number(lot('ROL-1').remainingQuantity)).toBe(99.4);
    expect(Number(lot('ROL-1').wasteQuantity)).toBe(0);
    expect(lot('ROL-1').status).toBe(SupplyLotStatus.AVAILABLE);
  });

  it('asigna a rollos lo pendiente cuando llega stock', async () => {
    setItem(2);
    await service.syncOrder('op-1');
    expect(qtyOf(null)).toBe(2);

    env.addLot('ROL-1', 10, 100);
    const res = await service.assignPending('s-uv', 'u1');

    expect(res).toEqual({ assigned: 1, remaining: 0 });
    expect(qtyOf('ROL-1')).toBe(2);
    expect(qtyOf(null)).toBe(0);
  });

  it('no deja corregir una OP anulada', async () => {
    env.db.order.status = OrderStatus.ANULADO;
    await expect(service.correctItem('it-1', 's-uv', 1, 'u1')).rejects.toThrow(BadRequestException);
  });

  // ---------------------------------------------------------------------------
  // Fase 4: recetas con varios insumos, vigencia, factor congelado y correcciones
  // ---------------------------------------------------------------------------

  describe('recetas por metro (fase 4)', () => {
    beforeEach(() => {
      env.addSupply('s-cinta', 'Cinta premium 20 mm');
      env.addSupply('s-papel', 'Papel de sublimación');
      env.addSupply('s-pluton', 'Tela pluton');
      env.addSupply('s-tifon', 'Tela tifón');
      env.addSupply('s-tinta', 'Tinta', 'L');
      const rule = (productId: string, supplyId: string, factor: number): Rule =>
        ({ productId, supplyId, factor: D(factor), isActive: true, autoConsume: true, effectiveFrom: RULE_START });
      env.db.rules.push(
        rule('p-cinta', 's-cinta', 0.9),
        rule('p-cinta', 's-papel', 0.05),
        rule('p-calandra', 's-papel', 1),
        rule('p-calandra', 's-pluton', 1),
      );
    });

    it('un producto con dos insumos descuenta de los dos: 250 cintas = 225 m de cinta + 12,5 m de papel', async () => {
      env.addLot('CIN-1', 100, 300, SupplyLotStatus.IN_USE, 1, 's-cinta');
      env.addLot('CIN-2', 100, 300, SupplyLotStatus.AVAILABLE, 2, 's-cinta');
      env.addLot('CIN-3', 100, 300, SupplyLotStatus.AVAILABLE, 3, 's-cinta');
      env.addLot('PAP-1', 100, 1000, SupplyLotStatus.AVAILABLE, 1, 's-papel');
      setItem(250, 'p-cinta');
      await service.syncOrder('op-1');

      expect(qtyOfSupply('s-cinta')).toBe(225);
      expect(Number(lot('CIN-3').remainingQuantity)).toBe(75);
      expect(qtyOfSupply('s-papel')).toBe(12.5);
      expect(env.db.rows.every((r) => r.factor !== null)).toBe(true);
    });

    it('una regla no toca ítems creados antes de su vigencia, aunque se edite la OP', async () => {
      env.addLot('PAP-1', 100, 1000, SupplyLotStatus.AVAILABLE, 1, 's-papel');
      env.db.rules.forEach((r) => (r.effectiveFrom = new Date(2026, 10, 20)));
      setItem(10, 'p-calandra', ITEM_DATE); // ítem del 14, regla desde el 20
      await service.syncOrder('op-1');
      setItem(12, 'p-calandra', ITEM_DATE);
      await service.syncOrder('op-1');

      expect(env.db.rows).toHaveLength(0);
      expect(Number(lot('PAP-1').remainingQuantity)).toBe(100);
    });

    it('cambiar el factor de la receta no mueve lo ya descontado; la cantidad nueva usa el factor congelado', async () => {
      env.addLot('CIN-1', 100, 300, SupplyLotStatus.AVAILABLE, 1, 's-cinta');
      env.addLot('PAP-1', 100, 1000, SupplyLotStatus.AVAILABLE, 1, 's-papel');
      setItem(10, 'p-cinta');
      await service.syncOrder('op-1');
      env.db.rules.find((r) => r.supplyId === 's-cinta')!.factor = D(1.2);
      await service.syncOrder('op-1');
      expect(qtyOfSupply('s-cinta')).toBe(9);

      setItem(20, 'p-cinta');
      await service.syncOrder('op-1');
      expect(qtyOfSupply('s-cinta')).toBe(18);
    });

    it('desactivar la regla no devuelve lo que ya consumieron las OP', async () => {
      env.addLot('PAP-1', 100, 1000, SupplyLotStatus.AVAILABLE, 1, 's-papel');
      env.addLot('PLU-1', 100, 5000, SupplyLotStatus.AVAILABLE, 1, 's-pluton');
      setItem(3, 'p-calandra');
      await service.syncOrder('op-1');
      env.db.rules.forEach((r) => (r.isActive = false));
      await service.syncOrder('op-1');

      expect(qtyOfSupply('s-papel')).toBe(3);
      expect(qtyOfSupply('s-pluton')).toBe(3);
    });

    it('si cambia el producto del ítem, devuelve el material de la receta anterior', async () => {
      env.addLot('PAP-1', 100, 1000, SupplyLotStatus.AVAILABLE, 1, 's-papel');
      env.addLot('PLU-1', 100, 5000, SupplyLotStatus.AVAILABLE, 1, 's-pluton');
      setItem(3, 'p-calandra');
      await service.syncOrder('op-1');
      setItem(3, 'p-sin-receta');
      await service.syncOrder('op-1');

      expect(env.db.rows).toHaveLength(0);
      expect(Number(lot('PLU-1').remainingQuantity)).toBe(100);
    });

    it('«lo pone el cliente» (corrección a 0) se respeta al volver a editar la OP', async () => {
      env.addLot('PAP-1', 100, 1000, SupplyLotStatus.AVAILABLE, 1, 's-papel');
      env.addLot('PLU-1', 100, 5000, SupplyLotStatus.AVAILABLE, 1, 's-pluton');
      setItem(4, 'p-calandra');
      await service.syncOrder('op-1');
      await service.correctItem('it-1', 's-pluton', 0, 'u1', 'El cliente trajo la tela');
      setItem(5, 'p-calandra');
      await service.syncOrder('op-1');

      expect(qtyOfSupply('s-pluton')).toBe(0);
      expect(Number(lot('PLU-1').remainingQuantity)).toBe(100);
      expect(qtyOfSupply('s-papel')).toBe(5);
      expect(env.db.overrides).toEqual([
        expect.objectContaining({ supplyId: 's-pluton', note: 'El cliente trajo la tela' }),
      ]);
    });

    it('corregir a 0 exige el motivo', async () => {
      setItem(4, 'p-calandra');
      await expect(service.correctItem('it-1', 's-pluton', 0, 'u1')).rejects.toThrow(BadRequestException);
      await expect(service.correctItem('it-1', 's-pluton', 0, 'u1', '   ')).rejects.toThrow(BadRequestException);
    });

    it('volver a automático borra la corrección y recalcula con la regla', async () => {
      env.addLot('PLU-1', 100, 5000, SupplyLotStatus.AVAILABLE, 1, 's-pluton');
      env.addLot('PAP-1', 100, 1000, SupplyLotStatus.AVAILABLE, 1, 's-papel');
      setItem(4, 'p-calandra');
      await service.syncOrder('op-1');
      await service.correctItem('it-1', 's-pluton', 0, 'u1', 'Tela del cliente');
      await service.correctItem('it-1', 's-pluton', null, 'u1');

      expect(env.db.overrides).toHaveLength(0);
      expect(qtyOfSupply('s-pluton')).toBe(4);
      expect(env.db.rows.filter((r) => r.supplyId === 's-pluton').every((r) => r.source === MaterialConsumptionSource.AUTO)).toBe(true);
    });

    it('cambiar de tela traslada el consumo al otro insumo y deja la receta en 0', async () => {
      env.addLot('PLU-1', 100, 5000, SupplyLotStatus.AVAILABLE, 1, 's-pluton');
      env.addLot('TIF-1', 50, 4000, SupplyLotStatus.AVAILABLE, 1, 's-tifon');
      env.addLot('PAP-1', 100, 1000, SupplyLotStatus.AVAILABLE, 1, 's-papel');
      setItem(6, 'p-calandra');
      await service.syncOrder('op-1');
      await service.swapSupply('it-1', 's-pluton', 's-tifon', undefined, 'u1');

      expect(qtyOfSupply('s-pluton')).toBe(0);
      expect(Number(lot('PLU-1').remainingQuantity)).toBe(100);
      expect(qtyOfSupply('s-tifon')).toBe(6);
      expect(Number(lot('TIF-1').remainingQuantity)).toBe(44);

      // Una edición posterior respeta el cambio.
      setItem(7, 'p-calandra');
      await service.syncOrder('op-1');
      expect(qtyOfSupply('s-pluton')).toBe(0);
      expect(qtyOfSupply('s-tifon')).toBe(6);
      expect(qtyOfSupply('s-papel')).toBe(7);
    });

    it('no deja cambiar a un insumo de otra unidad ni a uno sin rollos', async () => {
      setItem(6, 'p-calandra');
      await expect(service.swapSupply('it-1', 's-pluton', 's-tinta', 6, 'u1')).rejects.toThrow(BadRequestException);
      env.db.supplies['s-tifon'].trackLots = false;
      await expect(service.swapSupply('it-1', 's-pluton', 's-tifon', 6, 'u1')).rejects.toThrow(BadRequestException);
    });

    it('permite registrar a mano un insumo que el producto no tiene en su receta', async () => {
      env.addLot('TIF-1', 50, 4000, SupplyLotStatus.AVAILABLE, 1, 's-tifon');
      setItem(1, 'p-sin-receta');
      await service.correctItem('it-1', 's-tifon', 2.5, 'u1', 'Bandera 2,5 m');
      setItem(2, 'p-sin-receta');
      await service.syncOrder('op-1');

      expect(qtyOfSupply('s-tifon')).toBe(2.5);
    });

    it('devuelve las correcciones de 0 junto a los consumos de la OP', async () => {
      setItem(4, 'p-calandra');
      await service.correctItem('it-1', 's-pluton', 0, 'u1', 'Tela del cliente');
      const res = await service.getOrderConsumption('op-1');

      expect(res.overrides).toEqual([
        expect.objectContaining({ orderItemId: 'it-1', quantity: 0, note: 'Tela del cliente' }),
      ]);
    });
  });
});


describe('MaterialConsumptionService.getLotConsumption (rentabilidad del rollo)', () => {
  const D = (n: number) => new Prisma.Decimal(n);
  const order = (id: string) => ({
    id, orderNumber: id, status: OrderStatus.DELIVERED, subtotal: D(100000), discountAmount: D(0), taxRate: D(0),
    client: { name: 'Cliente' },
  });

  it('reparte la venta del ítem por los metros que salieron de este rollo, sin duplicar', async () => {
    const prisma = {
      supplyLot: {
        findUnique: jest.fn().mockResolvedValue({
          initialQuantity: D(10), remainingQuantity: D(2), wasteQuantity: D(1), unitCost: D(1000), totalCost: D(10000),
          status: SupplyLotStatus.AVAILABLE,
        }),
      },
      materialConsumption: {
        findMany: jest.fn().mockResolvedValue([
          // Ítem A: 4 m de este rollo de 8 m en total (los otros 4, de otro rollo).
          { id: 'c1', supplyId: 's', orderItemId: 'A', quantity: D(4), unitCost: D(1000), totalCost: D(4000),
            source: 'AUTO', createdAt: new Date(), order: order('OP-1'),
            orderItem: { id: 'A', description: 'A', total: D(80000), unitPrice: D(10000), annulledQuantity: D(0) } },
          // Ítem B: todo de este rollo.
          { id: 'c2', supplyId: 's', orderItemId: 'B', quantity: D(3), unitCost: D(1000), totalCost: D(3000),
            source: 'AUTO', createdAt: new Date(), order: order('OP-2'),
            orderItem: { id: 'B', description: 'B', total: D(20000), unitPrice: D(20000), annulledQuantity: D(0) } },
        ]),
        groupBy: jest.fn().mockResolvedValue([
          { orderItemId: 'A', supplyId: 's', _sum: { quantity: D(8) } },
          { orderItemId: 'B', supplyId: 's', _sum: { quantity: D(3) } },
        ]),
      },
    };
    const module = await Test.createTestingModule({
      providers: [
        MaterialConsumptionService,
        { provide: PrismaService, useValue: prisma },
        { provide: SupplyLotsRepository, useValue: {} },
        { provide: NotificationsService, useValue: {} },
      ],
    }).compile();
    const res = await module.get(MaterialConsumptionService).getLotConsumption('lot-1');

    expect(res.rows.map((r) => r.revenue)).toEqual([40000, 20000]);
    expect(res.summary).toMatchObject({
      acquisitionCost: 10000,
      consumedQuantity: 7,
      consumedValue: 7000,
      revenue: 60000,
      grossProfit: 53000,
      wasteValue: 1000,
      profitAfterWaste: 52000,
      remainingValue: 2000,
      orders: 2,
    });
  });
});
