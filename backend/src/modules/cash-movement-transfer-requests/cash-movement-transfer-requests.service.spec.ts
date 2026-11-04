import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ConflictException, ForbiddenException } from '@nestjs/common';
import { CashMovementTransferRequestsService } from './cash-movement-transfer-requests.service';
import { PrismaService } from '../../database/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { WhatsappService } from '../whatsapp/whatsapp.service';
import { ApprovalRequestRegistry } from '../whatsapp/approval-request-registry';
import { createMockPrismaService } from '../../database/prisma.service.mock';
import { EditRequestStatus, Prisma } from '../../generated/prisma';

const RECENT_CLOSE = () => new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);

const sourceSession = (overrides: Record<string, unknown> = {}) => ({
  id: 'cs-source',
  status: 'CLOSED',
  cashRegisterId: 'reg-1',
  openedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
  closedAt: RECENT_CLOSE(),
  openingAmount: new Prisma.Decimal(100000),
  closingAmount: new Prisma.Decimal(2780600),
  systemBalance: new Prisma.Decimal(2784462),
  discrepancy: new Prisma.Decimal(-3862),
  cashRegister: { id: 'reg-1', name: 'Caja Principal' },
  ...overrides,
});

const movement = (overrides: Record<string, unknown> = {}) => ({
  id: 'cm-1',
  receiptNumber: 'RC-2026-5969',
  movementType: 'EXPENSE',
  paymentMethod: 'CASH',
  amount: new Prisma.Decimal(2000),
  description: 'Pago de ítem de Orden de Gasto OG-2026-0890',
  referenceType: 'EXPENSE_ORDER',
  referenceId: 'og-1',
  isVoided: false,
  counterMovementId: null,
  createdAt: new Date(),
  cashSessionId: 'cs-source',
  originalMovement: null,
  cashSession: sourceSession(),
  ...overrides,
});

const openTarget = (overrides: Record<string, unknown> = {}) => ({
  id: 'cs-target',
  openedAt: new Date(),
  countStartedAt: null,
  status: 'OPEN',
  ...overrides,
});

const requestWithRelations = (overrides: Record<string, unknown> = {}) => ({
  id: 'tr-1',
  cashMovementId: 'cm-1',
  sourceSessionId: 'cs-source',
  requestedById: 'caja-1',
  reason: 'El proveedor nunca recibió el pago',
  status: EditRequestStatus.PENDING,
  createdAt: new Date(),
  reviewNotes: null,
  requestedBy: { id: 'caja-1', email: null, firstName: 'Nohora', lastName: 'Tibaquira' },
  reviewedBy: null,
  cashMovement: movement(),
  sourceSession: sourceSession(),
  targetSession: null,
  ...overrides,
});

describe('CashMovementTransferRequestsService', () => {
  let service: CashMovementTransferRequestsService;
  let prisma: any;
  let notifications: { create: jest.Mock; notifyAllAdmins: jest.Mock };
  let registry: { register: jest.Mock };

  beforeEach(async () => {
    prisma = createMockPrismaService();
    prisma.$transaction = jest.fn((cb: (tx: unknown) => unknown) => cb(prisma));
    prisma.$queryRaw = jest.fn().mockResolvedValue([{ id: 'cs-target' }]);
    prisma.auditLog.createMany = jest.fn().mockResolvedValue({ count: 2 });
    prisma.cashSession.findUniqueOrThrow = jest.fn().mockResolvedValue({ notes: null });
    prisma.cashMovement.updateMany = jest.fn().mockResolvedValue({ count: 1 });
    prisma.cashMovementVoidRequest.findFirst.mockResolvedValue(null);
    prisma.cashMovementTransferRequest.findMany.mockResolvedValue([]);
    prisma.expenseOrder.findUnique.mockResolvedValue({ id: 'og-1', ogNumber: 'OG-2026-0890' });
    prisma.cashMovement.findUnique.mockResolvedValue(movement());
    prisma.cashSession.findFirst.mockResolvedValue(openTarget());

    notifications = {
      create: jest.fn().mockResolvedValue(undefined),
      notifyAllAdmins: jest.fn().mockResolvedValue(undefined),
    };
    registry = { register: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CashMovementTransferRequestsService,
        { provide: PrismaService, useValue: prisma },
        { provide: NotificationsService, useValue: notifications },
        {
          provide: WhatsappService,
          useValue: {
            getAdminPhones: jest.fn().mockResolvedValue([]),
            sendApprovalNotification: jest.fn(),
          },
        },
        { provide: ApprovalRequestRegistry, useValue: registry },
      ],
    }).compile();

    service = module.get(CashMovementTransferRequestsService);
  });

  afterEach(() => jest.clearAllMocks());

  it('se registra para las aprobaciones por WhatsApp', () => {
    service.onModuleInit();
    expect(registry.register).toHaveBeenCalledWith('CASH_MOVEMENT_TRANSFER', service);
  });

  describe('preview', () => {
    it('muestra el efecto en el cierre de origen y en la caja de hoy', async () => {
      const preview = await service.preview('cm-1');
      expect(preview.ineligibleReason).toBeNull();
      expect(preview.targetIssue).toBeNull();
      expect(preview.effect).toMatchObject({
        discrepancyBefore: '-3862',
        discrepancyAfter: '-5862',
        worsens: true,
        targetExpectedChange: '-2000',
      });
      expect(preview.movement.expenseOrder?.ogNumber).toBe('OG-2026-0890');
    });

    it('bloquea un movimiento ya trasladado', async () => {
      prisma.cashMovementTransferRequest.findMany.mockResolvedValue([
        { id: 'tr-old', status: EditRequestStatus.APPROVED },
      ]);
      const preview = await service.preview('cm-1');
      expect(preview.ineligibleReason).toMatch(/ya se trasladó/);
      expect(preview.effect).toBeNull();
    });

    it('bloquea un movimiento con anulación pendiente', async () => {
      prisma.cashMovementVoidRequest.findFirst.mockResolvedValue({ id: 'void-1' });
      expect((await service.preview('cm-1')).ineligibleReason).toMatch(/anulación pendiente/);
    });

    it('avisa (sin bloquear la solicitud) si la caja de hoy está en arqueo', async () => {
      prisma.cashSession.findFirst.mockResolvedValue(openTarget({ countStartedAt: new Date() }));
      const preview = await service.preview('cm-1');
      expect(preview.ineligibleReason).toBeNull();
      expect(preview.targetIssue).toMatch(/arqueo/);
    });
  });

  describe('create', () => {
    const dto = { reason: 'El proveedor nunca recibió el pago', cashStayedInDrawer: true };

    it('no crea la solicitud si el dinero no se quedó en la caja', async () => {
      await expect(
        service.create('cm-1', 'caja-1', { ...dto, cashStayedInDrawer: false }),
      ).rejects.toThrow(/faltante/);
      expect(prisma.cashMovementTransferRequest.create).not.toHaveBeenCalled();
    });

    it('rechaza un movimiento que no es efectivo', async () => {
      prisma.cashMovement.findUnique.mockResolvedValue(movement({ paymentMethod: 'TRANSFER' }));
      await expect(service.create('cm-1', 'caja-1', dto)).rejects.toThrow(BadRequestException);
    });

    it('crea la solicitud y avisa a los admins', async () => {
      prisma.cashMovementTransferRequest.create.mockResolvedValue(requestWithRelations());
      await service.create('cm-1', 'caja-1', dto);
      expect(prisma.cashMovementTransferRequest.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            cashMovementId: 'cm-1',
            sourceSessionId: 'cs-source',
            cashStayedInDrawer: true,
          }),
        }),
      );
      expect(notifications.notifyAllAdmins).toHaveBeenCalledWith(
        expect.objectContaining({
          // Intl separa el símbolo con un espacio duro, de ahí el \s.
          message: expect.stringMatching(/RC-2026-5969 \(egreso de \$\s2\.000, OG-2026-0890\)/),
        }),
      );
    });
  });

  describe('approve', () => {
    beforeEach(() => {
      prisma.cashMovementTransferRequest.findUnique.mockResolvedValue({
        requestedById: 'caja-1',
        status: EditRequestStatus.PENDING,
      });
      prisma.user.findUnique.mockResolvedValue({ role: { name: 'admin' } });
      prisma.cashMovementTransferRequest.updateMany.mockResolvedValue({ count: 1 });
      prisma.cashMovementTransferRequest.findUniqueOrThrow
        .mockResolvedValueOnce(requestWithRelations())
        .mockResolvedValueOnce(requestWithRelations({ status: EditRequestStatus.APPROVED }));
      prisma.cashSession.findUnique.mockResolvedValue(openTarget());
    });

    it('solo un admin puede aprobar', async () => {
      prisma.user.findUnique.mockResolvedValue({ role: { name: 'caja' } });
      await expect(service.approve('tr-1', 'otro', {})).rejects.toThrow(ForbiddenException);
    });

    it('mueve el movimiento y recalcula el cierre de origen', async () => {
      await service.approve('tr-1', 'admin-1', {});

      expect(prisma.cashMovement.updateMany).toHaveBeenCalledWith({
        where: { id: 'cm-1', cashSessionId: 'cs-source', isVoided: false },
        data: expect.objectContaining({ cashSessionId: 'cs-target' }),
      });
      const sessionUpdate = prisma.cashSession.update.mock.calls[0][0];
      expect(sessionUpdate.where).toEqual({ id: 'cs-source' });
      expect(sessionUpdate.data.systemBalance.toNumber()).toBe(2786462);
      expect(sessionUpdate.data.discrepancy.toNumber()).toBe(-5862);
      expect(sessionUpdate.data.notes).toContain('RC-2026-5969');
      expect(prisma.auditLog.createMany).toHaveBeenCalled();
      expect(notifications.create).toHaveBeenCalledWith(
        expect.objectContaining({ message: expect.stringContaining('sube el comprobante') }),
      );
    });

    it('no aplica si la caja de hoy está en arqueo', async () => {
      prisma.cashSession.findUnique.mockResolvedValue(openTarget({ countStartedAt: new Date() }));
      await expect(service.approve('tr-1', 'admin-1', {})).rejects.toThrow(/arqueo/);
      expect(prisma.cashMovement.updateMany).not.toHaveBeenCalled();
    });

    it('no aplica si no hay caja abierta', async () => {
      prisma.$queryRaw
        .mockResolvedValueOnce([{ id: 'cs-source' }])
        .mockResolvedValueOnce([]);
      await expect(service.approve('tr-1', 'admin-1', {})).rejects.toThrow(/sesión abierta/);
    });

    it('si otra persona ya la procesó, no hace nada', async () => {
      prisma.cashMovementTransferRequest.updateMany.mockResolvedValue({ count: 0 });
      await expect(service.approve('tr-1', 'admin-1', {})).rejects.toThrow(ConflictException);
      expect(prisma.cashMovement.updateMany).not.toHaveBeenCalled();
    });
  });

  describe('reject', () => {
    it('exige el motivo del rechazo', async () => {
      prisma.cashMovementTransferRequest.findUnique.mockResolvedValue({
        requestedById: 'caja-1',
        status: EditRequestStatus.PENDING,
      });
      prisma.user.findUnique.mockResolvedValue({ role: { name: 'admin' } });
      await expect(service.reject('tr-1', 'admin-1', {})).rejects.toThrow(/motivo/);
    });
  });
});
