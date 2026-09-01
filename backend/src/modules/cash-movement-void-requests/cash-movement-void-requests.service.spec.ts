import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { CashMovementVoidRequestsService } from './cash-movement-void-requests.service';
import { PrismaService } from '../../database/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { WhatsappService } from '../whatsapp/whatsapp.service';
import { ApprovalRequestRegistry } from '../whatsapp/approval-request-registry';
import { CashMovementService } from '../cash-movement/cash-movement.service';
import { createMockPrismaService } from '../../database/prisma.service.mock';
import { EditRequestStatus, Prisma } from '../../generated/prisma';

const movementStub = (overrides: Record<string, any> = {}) => ({
  id: 'cm-1',
  isVoided: false,
  cashSessionId: 'cs-1',
  cashSession: { status: 'OPEN' },
  receiptNumber: 'REC-001',
  amount: new Prisma.Decimal(50000),
  movementType: 'INCOME',
  description: 'Abono',
  ...overrides,
});

const requestStub = (overrides: Record<string, any> = {}) => ({
  id: 'req-1',
  status: EditRequestStatus.PENDING,
  requestedById: 'user-1',
  cashMovementId: 'cm-1',
  voidReason: 'error de digitación',
  cashMovement: { id: 'cm-1', receiptNumber: 'REC-001' },
  requestedBy: { id: 'user-1', email: 'u@e.com', firstName: 'Ana', lastName: 'Gómez' },
  ...overrides,
});

describe('CashMovementVoidRequestsService', () => {
  let service: CashMovementVoidRequestsService;
  let prisma: ReturnType<typeof createMockPrismaService>;
  let notifications: { create: jest.Mock; notifyAllAdmins: jest.Mock };
  let whatsapp: { sendApprovalNotification: jest.Mock; getAdminPhones: jest.Mock };
  let registry: { register: jest.Mock };
  let cashMovement: { voidMovement: jest.Mock };

  beforeEach(async () => {
    prisma = createMockPrismaService();
    notifications = {
      create: jest.fn().mockResolvedValue(undefined),
      notifyAllAdmins: jest.fn().mockResolvedValue(undefined),
    };
    whatsapp = {
      sendApprovalNotification: jest.fn().mockResolvedValue(undefined),
      getAdminPhones: jest.fn().mockResolvedValue(['573212016229']),
    };
    registry = { register: jest.fn() };
    cashMovement = { voidMovement: jest.fn().mockResolvedValue(undefined) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CashMovementVoidRequestsService,
        { provide: PrismaService, useValue: prisma },
        { provide: NotificationsService, useValue: notifications },
        { provide: WhatsappService, useValue: whatsapp },
        { provide: ApprovalRequestRegistry, useValue: registry },
        { provide: CashMovementService, useValue: cashMovement },
      ],
    }).compile();

    service = module.get<CashMovementVoidRequestsService>(CashMovementVoidRequestsService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('onModuleInit', () => {
    it('registra el handler en el registro de aprobaciones', () => {
      service.onModuleInit();
      expect(registry.register).toHaveBeenCalledWith('CASH_MOVEMENT_VOID', service);
    });
  });

  describe('findPendingRequest', () => {
    it('devuelve null si no existe', async () => {
      prisma.cashMovementVoidRequest.findUnique.mockResolvedValue(null as any);
      await expect(service.findPendingRequest('req-1')).resolves.toBeNull();
    });

    it('devuelve la info de la solicitud', async () => {
      prisma.cashMovementVoidRequest.findUnique.mockResolvedValue(
        requestStub({ cashMovement: { receiptNumber: 'REC-001' } }) as any,
      );
      const info = await service.findPendingRequest('req-1');
      expect(info).toEqual(
        expect.objectContaining({
          id: 'req-1',
          requestedById: 'user-1',
          displayLabel: expect.stringContaining('REC-001'),
        }),
      );
    });
  });

  describe('approveViaWhatsApp', () => {
    it('no hace nada si la solicitud no existe o no está pendiente', async () => {
      prisma.cashMovementVoidRequest.findUnique.mockResolvedValue(
        requestStub({ status: EditRequestStatus.APPROVED }) as any,
      );
      await service.approveViaWhatsApp('req-1', 'admin-1');
      expect(cashMovement.voidMovement).not.toHaveBeenCalled();
    });

    it('aprueba, ejecuta la anulación y notifica', async () => {
      prisma.cashMovementVoidRequest.findUnique.mockResolvedValue(requestStub() as any);
      prisma.cashMovementVoidRequest.update.mockResolvedValue({} as any);

      await service.approveViaWhatsApp('req-1', 'admin-1');

      expect(prisma.cashMovementVoidRequest.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ status: EditRequestStatus.APPROVED }) }),
      );
      expect(cashMovement.voidMovement).toHaveBeenCalledWith(
        'cm-1',
        { voidReason: 'error de digitación' },
        'admin-1',
      );
      expect(notifications.create).toHaveBeenCalled();
    });
  });

  describe('rejectViaWhatsApp', () => {
    it('no hace nada si no está pendiente', async () => {
      prisma.cashMovementVoidRequest.findUnique.mockResolvedValue(null as any);
      await service.rejectViaWhatsApp('req-1', 'admin-1');
      expect(prisma.cashMovementVoidRequest.update).not.toHaveBeenCalled();
    });

    it('rechaza y notifica al solicitante', async () => {
      prisma.cashMovementVoidRequest.findUnique.mockResolvedValue(requestStub() as any);
      prisma.cashMovementVoidRequest.update.mockResolvedValue({} as any);

      await service.rejectViaWhatsApp('req-1', 'admin-1');

      expect(prisma.cashMovementVoidRequest.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ status: EditRequestStatus.REJECTED }) }),
      );
      expect(notifications.create).toHaveBeenCalled();
    });
  });

  describe('create', () => {
    const dto = { voidReason: 'error' } as any;

    it('lanza NotFound si el movimiento no existe', async () => {
      prisma.cashMovement.findUnique.mockResolvedValue(null as any);
      await expect(service.create({ cashMovementId: 'cm-1' }, 'user-1', dto)).rejects.toThrow(NotFoundException);
    });

    it('rechaza si el movimiento ya está anulado', async () => {
      prisma.cashMovement.findUnique.mockResolvedValue(movementStub({ isVoided: true }) as any);
      await expect(service.create({ cashMovementId: 'cm-1' }, 'user-1', dto)).rejects.toThrow(/ya está anulado/);
    });

    // Una caja cerrada es justo el caso donde la solicitud hace falta: el error
    // casi siempre se detecta al día siguiente. La reversa se registra después
    // en la sesión abierta, sin tocar el cierre firmado.
    it('acepta la solicitud aunque la sesión ya esté cerrada', async () => {
      prisma.cashMovement.findUnique.mockResolvedValue(
        movementStub({ cashSession: { status: 'CLOSED' } }) as any,
      );
      prisma.cashMovementVoidRequest.findFirst.mockResolvedValue(null as any);
      prisma.cashMovementVoidRequest.create.mockResolvedValue(requestStub({
        cashMovement: { id: 'cm-1', receiptNumber: 'REC-001', amount: new Prisma.Decimal(50000) },
      }) as any);
      prisma.user.findUnique.mockResolvedValue({ firstName: 'Ana', role: { name: 'asesor' } } as any);
      prisma.role.findUnique.mockResolvedValue({ users: [] } as any);

      await expect(service.create({ cashMovementId: 'cm-1' }, 'user-1', dto)).resolves.toBeDefined();
      expect(prisma.cashMovementVoidRequest.create).toHaveBeenCalled();
    });

    it('rechaza si ya hay una solicitud pendiente', async () => {
      prisma.cashMovement.findUnique.mockResolvedValue(movementStub() as any);
      prisma.cashMovementVoidRequest.findFirst.mockResolvedValue({ id: 'req-old' } as any);
      await expect(service.create({ cashMovementId: 'cm-1' }, 'user-1', dto)).rejects.toThrow(/solicitud de anulación pendiente/);
    });

    it('crea la solicitud y notifica a los administradores', async () => {
      prisma.cashMovement.findUnique.mockResolvedValue(movementStub() as any);
      prisma.cashMovementVoidRequest.findFirst.mockResolvedValue(null as any);
      prisma.cashMovementVoidRequest.create.mockResolvedValue(requestStub({
        cashMovement: { id: 'cm-1', receiptNumber: 'REC-001', amount: new Prisma.Decimal(50000) },
      }) as any);
      prisma.user.findUnique.mockResolvedValue({ firstName: 'Ana', lastName: 'Gómez', role: { name: 'asesor' } } as any);
      prisma.role.findUnique.mockResolvedValue({ users: [] } as any);

      const result = await service.create({ cashMovementId: 'cm-1' }, 'user-1', dto);

      expect(prisma.cashMovementVoidRequest.create).toHaveBeenCalled();
      expect(notifications.notifyAllAdmins).toHaveBeenCalled();
      expect(result).toBeDefined();
    });
  });

  describe('approve', () => {
    const dto = { reviewNotes: 'ok' } as any;

    it('lanza NotFound si la solicitud no existe o no está pendiente', async () => {
      prisma.cashMovementVoidRequest.findFirst.mockResolvedValue(null as any);
      await expect(service.approve('req-1', 'admin-1', dto)).rejects.toThrow(NotFoundException);
    });

    it('rechaza si el revisor no es admin', async () => {
      prisma.cashMovementVoidRequest.findFirst.mockResolvedValue(requestStub() as any);
      prisma.user.findUnique.mockResolvedValue({ role: { name: 'asesor' } } as any);
      await expect(service.approve('req-1', 'admin-1', dto)).rejects.toThrow(ForbiddenException);
    });

    it('aprueba, ejecuta la anulación y notifica', async () => {
      prisma.cashMovementVoidRequest.findFirst.mockResolvedValue(requestStub() as any);
      prisma.user.findUnique.mockResolvedValue({ role: { name: 'admin' } } as any);
      prisma.cashMovementVoidRequest.update.mockResolvedValue({ id: 'req-1' } as any);

      await service.approve('req-1', 'admin-1', dto);

      expect(cashMovement.voidMovement).toHaveBeenCalledWith(
        'cm-1',
        { voidReason: 'error de digitación' },
        'admin-1',
      );
      expect(notifications.create).toHaveBeenCalled();
    });
  });

  describe('reject', () => {
    const dto = { reviewNotes: 'no procede' } as any;

    it('lanza NotFound si no existe', async () => {
      prisma.cashMovementVoidRequest.findFirst.mockResolvedValue(null as any);
      await expect(service.reject('req-1', 'admin-1', dto)).rejects.toThrow(NotFoundException);
    });

    it('rechaza si el revisor no es admin', async () => {
      prisma.cashMovementVoidRequest.findFirst.mockResolvedValue(
        requestStub({ cashMovement: { receiptNumber: 'REC-001' } }) as any,
      );
      prisma.user.findUnique.mockResolvedValue({ role: { name: 'asesor' } } as any);
      await expect(service.reject('req-1', 'admin-1', dto)).rejects.toThrow(ForbiddenException);
    });

    it('rechaza la solicitud y notifica sin ejecutar la anulación', async () => {
      prisma.cashMovementVoidRequest.findFirst.mockResolvedValue(
        requestStub({ cashMovement: { receiptNumber: 'REC-001' } }) as any,
      );
      prisma.user.findUnique.mockResolvedValue({ role: { name: 'admin' } } as any);
      prisma.cashMovementVoidRequest.update.mockResolvedValue({ id: 'req-1' } as any);

      await service.reject('req-1', 'admin-1', dto);

      expect(cashMovement.voidMovement).not.toHaveBeenCalled();
      expect(notifications.create).toHaveBeenCalled();
    });
  });

  describe('queries', () => {
    it('findAllPending filtra por estado PENDING', async () => {
      prisma.cashMovementVoidRequest.findMany.mockResolvedValue([] as any);
      await service.findAllPending();
      expect(prisma.cashMovementVoidRequest.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { status: EditRequestStatus.PENDING } }),
      );
    });

    it('findAll devuelve todas', async () => {
      prisma.cashMovementVoidRequest.findMany.mockResolvedValue([] as any);
      await service.findAll();
      expect(prisma.cashMovementVoidRequest.findMany).toHaveBeenCalled();
    });

    it('findByMovement filtra por movimiento', async () => {
      prisma.cashMovementVoidRequest.findMany.mockResolvedValue([] as any);
      await service.findByMovement('cm-1');
      expect(prisma.cashMovementVoidRequest.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { cashMovementId: 'cm-1' } }),
      );
    });
  });

  describe('getEntityId', () => {
    it('devuelve el cashSessionId del movimiento', async () => {
      prisma.cashMovementVoidRequest.findUnique.mockResolvedValue({
        cashMovement: { cashSessionId: 'cs-9' },
      } as any);
      await expect(service.getEntityId('req-1')).resolves.toBe('cs-9');
    });

    it('devuelve null si la solicitud no existe', async () => {
      prisma.cashMovementVoidRequest.findUnique.mockResolvedValue(null as any);
      await expect(service.getEntityId('req-1')).resolves.toBeNull();
    });
  });
});
