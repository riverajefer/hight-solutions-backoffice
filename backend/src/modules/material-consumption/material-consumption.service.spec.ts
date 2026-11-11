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
  source: MaterialConsumptionSource; createdAt: Date;
}

function makeDb() {
  let seq = 0;
  const id = (p: string) => `${p}-${++seq}`;
  const db = {
    order: { id: 'op-1', orderNumber: 'OP-1', status: OrderStatus.DRAFT as OrderStatus, createdById: 'u1',
      items: [] as { id: string; productId: string | null; quantity: Prisma.Decimal }[] },
    rules: [{ productId: 'p-dtf', supplyId: 's-uv', factor: D(1) }],
    supply: { id: 's-uv', name: 'Rollo DTF UV', currentStock: D(0) },
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
        db.rules.filter((r) => where.productId.in.includes(r.productId))),
    },
    supply: {
      findUnique: jest.fn(async () => ({ trackLots: true, name: db.supply.name })),
      update: jest.fn(async ({ data }: { data: { currentStock: { increment?: Prisma.Decimal; decrement?: Prisma.Decimal } } }) => {
        const c = data.currentStock;
        db.supply.currentStock = c.increment ? db.supply.currentStock.add(c.increment) : db.supply.currentStock.sub(c.decrement!);
        return { currentStock: db.supply.currentStock };
      }),
    },
    supplyLot: {
      findMany: jest.fn(async () =>
        db.lots
          .filter((l) => (l.status === SupplyLotStatus.AVAILABLE || l.status === SupplyLotStatus.IN_USE) && l.remainingQuantity.greaterThan(0))
          .sort((a, b) => a.receivedAt.getTime() - b.receivedAt.getTime())
          .map((l) => ({ ...l, supply: { name: db.supply.name } }))),
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
        const r = { ...data, unitCost: data.unitCost ?? null, totalCost: data.totalCost ?? null, id: id('c'), createdAt: new Date(Date.now() + seq), quantity: D(data.quantity) } as Row;
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
        db.rows.filter((r) => matchRow(r, where)).forEach((r) => Object.assign(r, data));
      }),
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
  const addLot = (code: string, qty: number, cost: number, status: SupplyLotStatus = SupplyLotStatus.AVAILABLE, day = 1) => {
    db.lots.push({
      id: code, code, supplyId: 's-uv', status, remainingQuantity: D(qty), lowStockQuantity: D(qty / 10),
      unitCost: D(cost), wasteQuantity: D(0), receivedAt: new Date(2026, 10, day), sequence: day,
    });
    db.supply.currentStock = db.supply.currentStock.add(qty);
  };
  return { db, tx, addLot };
}

describe('MaterialConsumptionService', () => {
  let service: MaterialConsumptionService;
  let env: ReturnType<typeof makeDb>;
  const promoteNextLot = jest.fn(async () => null);

  const qtyOf = (lotId: string | null) =>
    env.db.rows.filter((r) => r.lotId === lotId).reduce((a, r) => a + Number(r.quantity), 0);
  const lot = (code: string) => env.db.lots.find((l) => l.code === code)!;
  const setItem = (qty: number) => {
    env.db.order.items = [{ id: 'it-1', productId: 'p-dtf', quantity: D(qty) }];
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
