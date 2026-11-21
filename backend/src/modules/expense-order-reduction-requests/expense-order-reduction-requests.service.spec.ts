import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { ExpenseOrderReductionRequestsService } from './expense-order-reduction-requests.service';
import { allocateReduction, mergeReductionItems } from './expense-order-reduction.util';
import { EditRequestStatus, Prisma } from '../../generated/prisma';

const DAY = 24 * 60 * 60 * 1000;
const D = (v: number) => new Prisma.Decimal(v);

const session = (overrides: Record<string, unknown> = {}) => ({
  id: 'cs-1',
  status: 'CLOSED',
  openedAt: new Date(Date.now() - 3 * DAY),
  closedAt: new Date(Date.now() - 2 * DAY),
  countStartedAt: null,
  closingAmount: D(1_029_585),
  systemBalance: D(1_000_000),
  discrepancy: D(29_585),
  notes: null,
  cashRegister: { id: 'reg-1', name: 'Caja Principal' },
  ...overrides,
});

const og = (overrides: Record<string, unknown> = {}) => ({
  id: 'og-1',
  ogNumber: 'OG-2026-1224',
  status: 'PAID',
  applyIva: false,
  ivaRate: D(0.19),
  retefuenteRate: D(0),
  reteICARate: D(0),
  reteIVARate: D(0),
  items: [{ id: 'item-1', name: 'Botones', quantity: D(202), unitPrice: D(542.5), total: D(109_585) }],
  accountPayable: {
    id: 'ap-1',
    apNumber: 'CP-2026-1711',
    status: 'PAID',
    payments: [{ amount: D(109_585), cashMovementId: 'cm-1' }],
  },
  ...overrides,
});

const movement = (overrides: Record<string, unknown> = {}) => ({
  id: 'cm-1',
  receiptNumber: 'RC-2026-7780',
  movementType: 'EXPENSE',
  paymentMethod: 'CASH',
  amount: D(109_585),
  createdAt: new Date(Date.now() - 2 * DAY),
  expenseOrderItemPayment: null,
  cashSession: session(),
  ...overrides,
});

// 202 × 396,04 ≈ 80.000: baja $29.585
const lower = [{ itemId: 'item-1', quantity: 202, unitPrice: 396.0396 }];
const lowerTo80k = [{ itemId: 'item-1', quantity: 160, unitPrice: 500 }];

function buildPrisma() {
  const fn = () => jest.fn();
  const prisma: any = {
    expenseOrder: { findUnique: fn() },
    expenseOrderItem: { update: fn() },
    cashMovement: { findMany: fn(), findUniqueOrThrow: fn(), update: fn(), create: fn() },
    cashSession: { findUniqueOrThrow: fn(), findUnique: fn(), findMany: fn(), findFirst: fn(), update: fn() },
    accountPayable: { findUniqueOrThrow: fn(), findUnique: fn(), update: fn() },
    accountPayablePayment: { updateMany: fn(), findMany: fn(), update: fn() },
    expenseOrderVoidRequest: { count: fn() },
    expenseOrderReductionRequest: {
      findFirst: fn(),
      findUnique: fn(),
      findUniqueOrThrow: fn(),
      count: fn(),
      create: fn(),
      update: fn(),
      updateMany: fn(),
    },
    user: { findUnique: fn() },
    auditLog: { createMany: fn(), create: fn() },
    $queryRaw: jest.fn().mockResolvedValue([]),
  };
  prisma.$transaction = jest.fn((cb: (tx: unknown) => unknown) => cb(prisma));
  prisma.expenseOrder.findUnique.mockResolvedValue(og());
  prisma.cashMovement.findMany.mockResolvedValue([movement()]);
  prisma.expenseOrderReductionRequest.findFirst.mockResolvedValue(null);
  prisma.expenseOrderReductionRequest.count.mockResolvedValue(0);
  prisma.expenseOrderVoidRequest.count.mockResolvedValue(0);
  prisma.expenseOrderReductionRequest.updateMany.mockResolvedValue({ count: 1 });
  prisma.cashSession.findUniqueOrThrow.mockResolvedValue({ notes: null });
  prisma.accountPayable.findUniqueOrThrow.mockResolvedValue({ totalAmount: D(80_000) });
  prisma.accountPayablePayment.findMany.mockResolvedValue([{ id: 'app-1', amount: D(80_000) }]);
  return prisma;
}

describe('expense-order-reduction.util', () => {
  it('no deja subir un ítem', () => {
    expect(() =>
      mergeReductionItems(og().items, [{ itemId: 'item-1', quantity: 300, unitPrice: 542.5 }]),
    ).toThrow(/sube de valor/);
  });

  it('exige todos los ítems', () => {
    expect(() => mergeReductionItems(og().items, [])).toThrow(/todos los ítems/);
  });

  it('rechaza un ítem que no es de la OG, cantidad cero o precio negativo', () => {
    expect(() => mergeReductionItems(og().items, [{ itemId: 'otro', quantity: 1, unitPrice: 1 }])).toThrow(
      /Falta el ítem/,
    );
    expect(() => mergeReductionItems(og().items, [{ itemId: 'item-1', quantity: 0, unitPrice: 1 }])).toThrow(
      /mayor que cero/,
    );
    expect(() => mergeReductionItems(og().items, [{ itemId: 'item-1', quantity: 1, unitPrice: -1 }])).toThrow(
      /negativo/,
    );
  });

  it('calcula el total nuevo del ítem y conserva el anterior', () => {
    const [item] = mergeReductionItems(og().items, lowerTo80k);
    expect(item).toMatchObject({ total: '80000', previousTotal: '109585', previousQuantity: '202' });
  });

  it('dice cuánto falta si los egresos no alcanzan, y salta los que están en cero', () => {
    const { allocations, shortfall } = allocateReduction(
      [
        { id: 'cero', amount: 0 },
        { id: 'chico', amount: 5_000 },
      ],
      D(8_000),
    );
    expect(allocations.map((a) => a.movement.id)).toEqual(['chico']);
    expect(shortfall.toString()).toBe('3000');
  });

  it('reparte la diferencia del egreso más reciente al más antiguo', () => {
    const { allocations, shortfall } = allocateReduction(
      [
        { id: 'nuevo', amount: 10_000 },
        { id: 'viejo', amount: 50_000 },
      ],
      D(25_000),
    );
    expect(allocations.map((a) => [a.movement.id, a.amountAfter.toString()])).toEqual([
      ['nuevo', '0'],
      ['viejo', '35000'],
    ]);
    expect(shortfall.toString()).toBe('0');
  });
});

describe('ExpenseOrderReductionRequestsService', () => {
  let service: ExpenseOrderReductionRequestsService;
  let prisma: any;
  let notifications: { create: jest.Mock; notifyAllAdmins: jest.Mock };
  let accountsPayable: { settleFromExpenseOrderMovements: jest.Mock };
  let consecutives: { generateNumber: jest.Mock };

  beforeEach(() => {
    prisma = buildPrisma();
    notifications = { create: jest.fn(), notifyAllAdmins: jest.fn() };
    accountsPayable = { settleFromExpenseOrderMovements: jest.fn() };
    consecutives = { generateNumber: jest.fn().mockResolvedValue('RC-2026-9000') };
    service = new ExpenseOrderReductionRequestsService(
      prisma,
      notifications as any,
      { getAdminPhones: jest.fn().mockResolvedValue([]) } as any,
      { register: jest.fn() } as any,
      accountsPayable as any,
      consecutives as any,
    );
  });

  describe('preview', () => {
    it('si el dinero nunca salió, baja el egreso y corrige el cierre de esa caja', async () => {
      const plan = await service.preview('og-1', { items: lowerTo80k, moneyLocation: 'NEVER_LEFT' });

      expect(plan.ineligibleReason).toBeNull();
      expect(plan.difference).toBe('29585');
      expect(plan.adjustments[0]).toMatchObject({ receiptNumber: 'RC-2026-7780', amountAfter: '80000' });
      expect(plan.closings[0]).toMatchObject({ systemBalanceAfter: '1029585', discrepancyAfter: '0' });
    });

    it('si el proveedor devuelve, no toca la caja al aprobar', async () => {
      const plan = await service.preview('og-1', { items: lowerTo80k, moneyLocation: 'SUPPLIER_RETURNS' });
      expect(plan.adjustments).toHaveLength(0);
      expect(plan.closings).toHaveLength(0);
      expect(plan.difference).toBe('29585');
    });

    it('rechaza si el valor no baja de lo pagado', async () => {
      const plan = await service.preview('og-1', {
        items: [{ itemId: 'item-1', quantity: 202, unitPrice: 542.5 }],
        moneyLocation: 'SUPPLIER_RETURNS',
      });
      expect(plan.ineligibleReason).toMatch(/no baja de lo pagado/);
    });

    it('rechaza una OG que no está pagada', async () => {
      prisma.expenseOrder.findUnique.mockResolvedValue(og({ status: 'CREATED' }));
      const plan = await service.preview('og-1', { items: lower, moneyLocation: 'SUPPLIER_RETURNS' });
      expect(plan.ineligibleReason).toMatch(/OG pagada/);
    });

    it('no corrige un egreso que es parte de un pago mixto', async () => {
      prisma.cashMovement.findMany.mockResolvedValue([movement({ expenseOrderItemPayment: { id: 'line-1' } })]);
      const plan = await service.preview('og-1', { items: lowerTo80k, moneyLocation: 'NEVER_LEFT' });
      expect(plan.ineligibleReason).toMatch(/pago mixto/);
    });
  });

  describe('approve', () => {
    const pendingRequest = (moneyLocation: string) => ({
      id: 'rr-1',
      expenseOrderId: 'og-1',
      requestedById: 'requester-1',
      reason: 'El valor real era menor',
      newItems: lowerTo80k,
      moneyLocation,
      difference: D(29_585),
      createdAt: new Date(),
    });

    beforeEach(() => {
      prisma.user.findUnique.mockResolvedValue({ role: { name: 'admin' } });
      prisma.expenseOrderReductionRequest.findUnique.mockResolvedValue({
        requestedById: 'requester-1',
        status: EditRequestStatus.PENDING,
      });
    });

    it('no deja aprobar a quien la pidió, aunque sea admin', async () => {
      await expect(service.approve('rr-1', 'requester-1', {})).rejects.toThrow(ForbiddenException);
    });

    it('nunca salió: baja el egreso, su abono y recalcula el cierre', async () => {
      prisma.expenseOrderReductionRequest.findUniqueOrThrow
        .mockResolvedValueOnce({ expenseOrderId: 'og-1' })
        .mockResolvedValueOnce(pendingRequest('NEVER_LEFT'))
        .mockResolvedValue({
          ...pendingRequest('NEVER_LEFT'),
          previousTotal: D(109_585),
          newTotal: D(80_000),
          expenseOrder: { id: 'og-1', ogNumber: 'OG-2026-1224', createdById: 'creator-1' },
        });
      prisma.cashMovement.findUniqueOrThrow.mockResolvedValue({
        description: 'Pago OG',
        amount: D(109_585),
        isVoided: false,
      });

      await service.approve('rr-1', 'admin-2', {});

      expect(accountsPayable.settleFromExpenseOrderMovements).toHaveBeenCalledWith('og-1', 'admin-2');
      expect(prisma.expenseOrderItem.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'item-1' }, data: expect.objectContaining({ quantity: 160 }) }),
      );
      expect(prisma.cashMovement.update.mock.calls[0][0].data.amount.toString()).toBe('80000');
      expect(prisma.accountPayablePayment.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { cashMovementId: 'cm-1', isReversed: false } }),
      );
      const closing = prisma.cashSession.update.mock.calls[0][0].data;
      expect(closing.systemBalance.toString()).toBe('1029585');
      expect(closing.discrepancy.toString()).toBe('0');
    });

    it('el proveedor devuelve: no toca la caja, solo la OG y la CP', async () => {
      prisma.expenseOrderReductionRequest.findUniqueOrThrow
        .mockResolvedValueOnce({ expenseOrderId: 'og-1' })
        .mockResolvedValueOnce(pendingRequest('SUPPLIER_RETURNS'))
        .mockResolvedValue({
          ...pendingRequest('SUPPLIER_RETURNS'),
          previousTotal: D(109_585),
          newTotal: D(80_000),
          expenseOrder: { id: 'og-1', ogNumber: 'OG-2026-1224', createdById: 'creator-1' },
        });

      await service.approve('rr-1', 'admin-2', {});

      // Al aplicar, la solicitud ya está APPROVED: no puede contarse a sí misma
      // como «reintegro pendiente» (pasó en la prueba local).
      expect(prisma.expenseOrderReductionRequest.count).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ id: { not: 'rr-1' } }) }),
      );
      expect(prisma.cashMovement.update).not.toHaveBeenCalled();
      expect(prisma.cashSession.update).not.toHaveBeenCalled();
      expect(prisma.accountPayable.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'ap-1' }, data: expect.objectContaining({ totalAmount: D(80_000) }) }),
      );
      expect(notifications.create).toHaveBeenCalledWith(
        expect.objectContaining({ message: expect.stringContaining('Caja debe registrar el reintegro') }),
      );
    });
  });

  describe('registerRefund', () => {
    const approved = {
      id: 'rr-1',
      status: EditRequestStatus.APPROVED,
      moneyLocation: 'SUPPLIER_RETURNS',
      refundReceivedAt: null,
      difference: D(29_585),
      previousTotal: D(109_585),
      newTotal: D(80_000),
      expenseOrder: { id: 'og-1', ogNumber: 'OG-2026-1224', createdById: 'creator-1' },
    };

    it('crea el ingreso en la caja abierta y baja los abonos de la CP', async () => {
      prisma.expenseOrderReductionRequest.findUnique.mockResolvedValue(approved);
      prisma.cashSession.findMany.mockResolvedValue([{ id: 'cs-open', countStartedAt: null }]);
      prisma.cashSession.findUnique.mockResolvedValue({ status: 'OPEN', countStartedAt: null });
      prisma.cashMovement.create.mockResolvedValue({ id: 'cm-refund' });
      prisma.accountPayable.findUnique.mockResolvedValue({ id: 'ap-1' });
      prisma.accountPayablePayment.findMany.mockResolvedValue([{ id: 'app-1', amount: D(109_585) }]);
      prisma.expenseOrderReductionRequest.findUniqueOrThrow.mockResolvedValue(approved);

      await service.registerRefund('rr-1', 'caja-1', { paymentMethod: 'CASH' });

      expect(prisma.cashMovement.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            cashSessionId: 'cs-open',
            movementType: 'INCOME',
            amount: D(29_585),
            referenceType: 'EXPENSE_ORDER',
          }),
        }),
      );
      expect(prisma.accountPayablePayment.update.mock.calls[0][0].data.amount.toString()).toBe('80000');
    });

    it('no registra dos veces el mismo reintegro', async () => {
      prisma.expenseOrderReductionRequest.findUnique.mockResolvedValue({ ...approved, refundReceivedAt: new Date() });
      await expect(service.registerRefund('rr-1', 'caja-1', { paymentMethod: 'CASH' })).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
