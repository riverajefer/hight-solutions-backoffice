import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { ExpenseOrderVoidRequestsService } from './expense-order-void-requests.service';
import { EditRequestStatus, Prisma } from '../../generated/prisma';

const DAY = 24 * 60 * 60 * 1000;

const closedSession = (overrides: Record<string, unknown> = {}) => ({
  id: 'cs-closed',
  status: 'CLOSED',
  openedAt: new Date(Date.now() - 3 * DAY),
  closedAt: new Date(Date.now() - 2 * DAY),
  countStartedAt: null,
  closingAmount: new Prisma.Decimal(2_789_749),
  systemBalance: new Prisma.Decimal(2_680_164),
  discrepancy: new Prisma.Decimal(109_585),
  notes: null,
  cashRegister: { id: 'reg-1', name: 'Caja Principal' },
  ...overrides,
});

const movement = (overrides: Record<string, unknown> = {}) => ({
  id: 'cm-1',
  receiptNumber: 'RC-2026-7780',
  movementType: 'EXPENSE',
  paymentMethod: 'CASH',
  amount: new Prisma.Decimal(109_585),
  description: 'Pago de OG-2026-1224',
  createdAt: new Date(Date.now() - 2 * DAY),
  cashSession: closedSession(),
  ...overrides,
});

const expenseOrder = (overrides: Record<string, unknown> = {}) => ({
  id: 'og-1',
  ogNumber: 'OG-2026-1224',
  status: 'PAID',
  createdById: 'creator-1',
  items: [{ id: 'item-1' }],
  accountPayable: {
    id: 'ap-1',
    apNumber: 'CP-2026-1711',
    status: 'PAID',
    paidAmount: new Prisma.Decimal(109_585),
    payments: [{ id: 'app-1', cashMovementId: 'cm-1' }],
  },
  ...overrides,
});

const lot = (overrides: Record<string, unknown> = {}) => ({
  id: 'lot-1',
  code: 'ROL-UV-0007',
  status: 'AVAILABLE',
  initialQuantity: new Prisma.Decimal(50),
  remainingQuantity: new Prisma.Decimal(50),
  consumptions: [],
  _count: { movements: 0 },
  ...overrides,
});

const request = (overrides: Record<string, unknown> = {}) => ({
  id: 'vr-1',
  expenseOrderId: 'og-1',
  requestedById: 'requester-1',
  reason: 'El valor quedó mayor al real',
  cashStayedInDrawer: true,
  status: EditRequestStatus.PENDING,
  createdAt: new Date(),
  requestedBy: { id: 'requester-1', email: null, firstName: 'Adriana', lastName: 'Páez' },
  reviewedBy: null,
  expenseOrder: { id: 'og-1', ogNumber: 'OG-2026-1224', status: 'PAID', createdById: 'creator-1' },
  ...overrides,
});

function buildPrisma() {
  const fn = () => jest.fn();
  const prisma: any = {
    expenseOrder: { findUnique: fn(), updateMany: fn() },
    cashMovement: { findMany: fn(), updateMany: fn() },
    supplyLot: { findMany: fn() },
    cashSession: { findUniqueOrThrow: fn(), update: fn() },
    accountPayable: { update: fn() },
    accountPayablePayment: { updateMany: fn() },
    expenseOrderAuthRequest: { count: fn() },
    expenseOrderEditRequest: { count: fn() },
    accountPayableAuthRequest: { count: fn() },
    accountPayablePaymentAuthRequest: { count: fn() },
    accountPayablePaymentReversalRequest: { count: fn() },
    cashMovementVoidRequest: { count: fn() },
    cashMovementTransferRequest: { count: fn() },
    expenseOrderReductionRequest: { count: jest.fn().mockResolvedValue(0) },
    expenseOrderVoidRequest: {
      findFirst: fn(),
      findUnique: fn(),
      findUniqueOrThrow: fn(),
      findMany: fn(),
      create: fn(),
      update: fn(),
      updateMany: fn(),
    },
    user: { findUnique: fn() },
    auditLog: { createMany: fn() },
    $queryRaw: jest.fn().mockResolvedValue([]),
  };
  prisma.$transaction = jest.fn((cb: (tx: unknown) => unknown) => cb(prisma));

  prisma.expenseOrder.findUnique.mockResolvedValue(expenseOrder());
  prisma.cashMovement.findMany.mockResolvedValue([movement()]);
  prisma.supplyLot.findMany.mockResolvedValue([]);
  for (const model of [
    'expenseOrderAuthRequest',
    'expenseOrderEditRequest',
    'accountPayableAuthRequest',
    'accountPayablePaymentAuthRequest',
    'accountPayablePaymentReversalRequest',
    'cashMovementVoidRequest',
    'cashMovementTransferRequest',
  ]) {
    prisma[model].count.mockResolvedValue(0);
  }
  prisma.expenseOrderVoidRequest.findFirst.mockResolvedValue(null);
  prisma.cashMovement.updateMany.mockResolvedValue({ count: 1 });
  prisma.expenseOrder.updateMany.mockResolvedValue({ count: 1 });
  prisma.cashSession.findUniqueOrThrow.mockResolvedValue({ notes: null });
  prisma.expenseOrderVoidRequest.updateMany.mockResolvedValue({ count: 1 });
  return prisma;
}

describe('ExpenseOrderVoidRequestsService', () => {
  let service: ExpenseOrderVoidRequestsService;
  let prisma: any;
  let notifications: { create: jest.Mock; notifyAllAdmins: jest.Mock };
  let supplyLots: { voidInTransaction: jest.Mock };

  const asAdmin = () => prisma.user.findUnique.mockResolvedValue({ role: { name: 'admin' } });

  beforeEach(() => {
    prisma = buildPrisma();
    notifications = { create: jest.fn(), notifyAllAdmins: jest.fn() };
    supplyLots = { voidInTransaction: jest.fn() };
    const whatsapp = {
      getAdminPhones: jest.fn().mockResolvedValue([]),
      sendApprovalNotification: jest.fn(),
    };
    service = new ExpenseOrderVoidRequestsService(
      prisma,
      notifications as any,
      whatsapp as any,
      { register: jest.fn() } as any,
      supplyLots as any,
    );
  });

  describe('preview', () => {
    it('calcula el cierre que se corrige al anular un egreso de una caja cerrada', async () => {
      const plan = await service.preview('og-1');

      expect(plan.ineligibleReason).toBeNull();
      expect(plan.closings).toHaveLength(1);
      expect(plan.closings[0]).toMatchObject({
        receipts: ['RC-2026-7780'],
        systemBalanceAfter: '2789749',
        discrepancyAfter: '0',
      });
      expect(plan.accountPayable).toMatchObject({ apNumber: 'CP-2026-1711', paymentsToReverse: 1 });
    });

    it('en una caja abierta no hay cierre que corregir: sube lo esperado de hoy', async () => {
      prisma.cashMovement.findMany.mockResolvedValue([
        movement({
          cashSession: closedSession({ status: 'OPEN', closedAt: null, systemBalance: null }),
        }),
      ]);
      const plan = await service.preview('og-1');
      expect(plan.closings).toHaveLength(0);
      expect(plan.openSessionsCashChange).toBe('109585');
    });

    it('bloquea si un rollo de la OG ya tiene consumos, y dice en qué OP', async () => {
      prisma.supplyLot.findMany.mockResolvedValue([
        lot({
          consumptions: [{ order: { orderNumber: 'OP-2026-5001' } }],
          _count: { movements: 1 },
        }),
      ]);
      const plan = await service.preview('og-1');
      expect(plan.ineligibleReason).toMatch(/ROL-UV-0007 \(usado en OP-2026-5001\)/);
    });

    it('bloquea una OG ya anulada', async () => {
      prisma.expenseOrder.findUnique.mockResolvedValue(expenseOrder({ status: 'VOIDED' }));
      const plan = await service.preview('og-1');
      expect(plan.ineligibleReason).toBe('La OG ya está anulada.');
    });

    it('bloquea si la OG tiene una edición pendiente', async () => {
      prisma.expenseOrderEditRequest.count.mockResolvedValue(1);
      const plan = await service.preview('og-1');
      expect(plan.ineligibleReason).toMatch(/edición pendiente/);
    });
  });

  describe('create', () => {
    it('no crea la solicitud si el dinero salió de la empresa', async () => {
      await expect(
        service.create('og-1', 'requester-1', {
          reason: 'El valor quedó mayor al real',
          cashStayedInDrawer: false,
        }),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.expenseOrderVoidRequest.create).not.toHaveBeenCalled();
    });

    it('crea la solicitud y avisa a los admins', async () => {
      prisma.expenseOrderVoidRequest.create.mockResolvedValue(request());
      await service.create('og-1', 'requester-1', {
        reason: 'El valor quedó mayor al real',
        cashStayedInDrawer: true,
      });
      expect(prisma.expenseOrderVoidRequest.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ expenseOrderId: 'og-1', cashStayedInDrawer: true }),
        }),
      );
      expect(notifications.notifyAllAdmins).toHaveBeenCalledWith(
        expect.objectContaining({ message: expect.stringContaining('anular la OG-2026-1224') }),
      );
    });
  });

  describe('approve', () => {
    beforeEach(() => {
      prisma.expenseOrderVoidRequest.findUnique.mockResolvedValue({
        requestedById: 'requester-1',
        status: EditRequestStatus.PENDING,
      });
      prisma.expenseOrderVoidRequest.findUniqueOrThrow
        .mockResolvedValueOnce({
          id: 'vr-1',
          expenseOrderId: 'og-1',
          reason: 'El valor quedó mayor al real',
          createdAt: new Date(),
          cashStayedInDrawer: true,
        })
        .mockResolvedValue(request({ status: EditRequestStatus.APPROVED }));
    });

    it('no deja que quien la pidió la apruebe, aunque sea admin', async () => {
      asAdmin();
      await expect(service.approve('vr-1', 'requester-1', {})).rejects.toThrow(ForbiddenException);
    });

    it('solo un admin la aprueba', async () => {
      prisma.user.findUnique.mockResolvedValue({ role: { name: 'caja' } });
      await expect(service.approve('vr-1', 'caja-1', {})).rejects.toThrow(ForbiddenException);
    });

    it('anula egresos, corrige el cierre, anula la CP y los rollos, y deja la OG anulada', async () => {
      asAdmin();
      prisma.supplyLot.findMany.mockResolvedValue([lot()]);

      await service.approve('vr-1', 'admin-2', {});

      expect(prisma.cashMovement.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'cm-1', isVoided: false },
          data: expect.objectContaining({ isVoided: true, voidedById: 'admin-2' }),
        }),
      );
      const sessionUpdate = prisma.cashSession.update.mock.calls[0][0];
      expect(sessionUpdate.where).toEqual({ id: 'cs-closed' });
      expect(sessionUpdate.data.systemBalance.toString()).toBe('2789749');
      expect(sessionUpdate.data.discrepancy.toString()).toBe('0');

      expect(prisma.accountPayablePayment.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { accountPayableId: 'ap-1', isReversed: false } }),
      );
      expect(prisma.accountPayable.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'CANCELLED', paidAmount: 0 }),
        }),
      );
      expect(supplyLots.voidInTransaction).toHaveBeenCalledWith(
        prisma,
        'lot-1',
        expect.stringContaining('OG-2026-1224'),
        'admin-2',
      );
      expect(prisma.expenseOrder.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'VOIDED', voidedById: 'admin-2' }),
        }),
      );
      expect(prisma.auditLog.createMany).toHaveBeenCalled();
      expect(notifications.create).toHaveBeenCalledTimes(2); // quien pidió y quien creó la OG
    });

    it('no aplica si la caja del egreso está en arqueo', async () => {
      asAdmin();
      prisma.cashMovement.findMany.mockResolvedValue([
        movement({
          cashSession: closedSession({
            status: 'OPEN',
            closedAt: null,
            countStartedAt: new Date(),
          }),
        }),
      ]);
      await expect(service.approve('vr-1', 'admin-2', {})).rejects.toThrow(/arqueo/);
      expect(prisma.expenseOrder.updateMany).not.toHaveBeenCalled();
    });
  });
});
