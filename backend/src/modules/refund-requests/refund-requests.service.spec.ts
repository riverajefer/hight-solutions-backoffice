import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { RefundRequestsService } from './refund-requests.service';
import { PrismaService } from '../../database/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { WhatsappService } from '../whatsapp/whatsapp.service';
import { WsEventsGateway } from '../ws-events/ws-events.gateway';
import { ConsecutivesService } from '../consecutives/consecutives.service';
import { ApprovalRequestRegistry } from '../whatsapp/approval-request-registry';
import {
  createMockPrismaService,
  MockPrismaService,
} from '../../database/prisma.service.mock';
import { EditRequestStatus } from '../../generated/prisma';

describe('RefundRequestsService', () => {
  let service: RefundRequestsService;
  let prisma: MockPrismaService;
  let notifications: { notifyUsersWithPermission: jest.Mock; create: jest.Mock };
  let whatsapp: { sendApprovalNotification: jest.Mock };
  let wsGateway: {
    emitApprovalCreated: jest.Mock;
    emitApprovalUpdated: jest.Mock;
  };
  let consecutives: { generateNumber: jest.Mock };
  let registry: { register: jest.Mock };

  beforeEach(async () => {
    prisma = createMockPrismaService();

    notifications = {
      notifyUsersWithPermission: jest.fn().mockResolvedValue(undefined),
      create: jest.fn().mockResolvedValue(undefined),
    };
    whatsapp = {
      sendApprovalNotification: jest.fn().mockResolvedValue(undefined),
    };
    wsGateway = {
      emitApprovalCreated: jest.fn(),
      emitApprovalUpdated: jest.fn(),
    };
    consecutives = {
      generateNumber: jest.fn().mockResolvedValue('CR-0001'),
    };
    registry = { register: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RefundRequestsService,
        { provide: PrismaService, useValue: prisma },
        { provide: NotificationsService, useValue: notifications },
        { provide: ApprovalRequestRegistry, useValue: registry },
        { provide: WhatsappService, useValue: whatsapp },
        { provide: WsEventsGateway, useValue: wsGateway },
        { provide: ConsecutivesService, useValue: consecutives },
      ],
    }).compile();

    service = module.get<RefundRequestsService>(RefundRequestsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('onModuleInit', () => {
    it('registers REFUND_REQUEST with approval registry', () => {
      service.onModuleInit();
      expect(registry.register).toHaveBeenCalledWith('REFUND_REQUEST', service);
    });
  });

  describe('create', () => {
    const userId = 'user-1';
    const orderId = 'order-1';
    const baseDto = {
      orderId,
      refundAmount: 100,
      paymentMethod: 'CASH' as const,
      observation: 'Cliente pagó de más',
    };

    beforeEach(() => {
      prisma.user.findUnique.mockResolvedValue({
        id: userId,
        firstName: 'Ana',
        lastName: 'Pérez',
        email: 'ana@test.com',
      });
      prisma.user.findMany.mockResolvedValue([]);
    });

    it('throws NotFoundException if order does not exist', async () => {
      prisma.order.findUnique.mockResolvedValue(null);
      await expect(service.create(userId, baseDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws ConflictException if there is an existing PENDING request', async () => {
      prisma.order.findUnique.mockResolvedValue({
        id: orderId,
        orderNumber: 'OP-1',
        total: '500',
        paidAmount: '700',
        balance: '-200',
      });
      prisma.refundRequest.findFirst.mockResolvedValue({ id: 'existing' });

      await expect(service.create(userId, baseDto)).rejects.toThrow(
        ConflictException,
      );
    });

    it('throws BadRequestException if no overpayment exists', async () => {
      prisma.order.findUnique.mockResolvedValue({
        id: orderId,
        orderNumber: 'OP-1',
        total: '500',
        paidAmount: '500',
        balance: '0',
      });
      prisma.refundRequest.findFirst.mockResolvedValue(null);

      await expect(service.create(userId, baseDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('throws BadRequestException if refund amount exceeds overpayment', async () => {
      prisma.order.findUnique.mockResolvedValue({
        id: orderId,
        orderNumber: 'OP-1',
        total: '500',
        paidAmount: '550',
        balance: '-50',
      });
      prisma.refundRequest.findFirst.mockResolvedValue(null);

      await expect(
        service.create(userId, { ...baseDto, refundAmount: 200 }),
      ).rejects.toThrow(BadRequestException);
    });

    it('creates PENDING request and notifies reviewers', async () => {
      prisma.order.findUnique.mockResolvedValue({
        id: orderId,
        orderNumber: 'OP-1',
        total: '500',
        paidAmount: '700',
        balance: '-200',
      });
      prisma.refundRequest.findFirst.mockResolvedValue(null);
      prisma.refundRequest.create.mockResolvedValue({
        id: 'req-1',
        orderId,
        status: EditRequestStatus.PENDING,
        order: { orderNumber: 'OP-1' },
      });

      const result = await service.create(userId, baseDto);

      expect(prisma.refundRequest.create).toHaveBeenCalled();
      expect(notifications.notifyUsersWithPermission).toHaveBeenCalledWith(
        'approve_refunds',
        expect.objectContaining({
          type: 'REFUND_REQUEST_PENDING',
        }),
      );
      expect(wsGateway.emitApprovalCreated).toHaveBeenCalled();
      expect(result.id).toBe('req-1');
    });
  });

  describe('approve', () => {
    const reviewerId = 'reviewer-1';
    const requestId = 'req-1';

    beforeEach(() => {
      prisma.$transaction.mockImplementation((fn: any) => fn(prisma));
    });

    it('throws NotFoundException if request not found or not pending', async () => {
      prisma.refundRequest.findFirst.mockResolvedValue(null);
      await expect(
        service.approve(requestId, reviewerId, {}),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException if reviewer lacks permission', async () => {
      prisma.refundRequest.findFirst.mockResolvedValue({
        id: requestId,
        orderId: 'o1',
        requestedById: 'u1',
        refundAmount: '100',
        paymentMethod: 'CASH',
        observation: 'x',
        order: {
          id: 'o1',
          orderNumber: 'OP-1',
          total: '500',
          paidAmount: '700',
          balance: '-200',
        },
      });
      prisma.user.findUnique.mockResolvedValue({
        role: { permissions: [] },
      });

      await expect(
        service.approve(requestId, reviewerId, {}),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws BadRequestException if no open cash session', async () => {
      prisma.refundRequest.findFirst.mockResolvedValue({
        id: requestId,
        orderId: 'o1',
        requestedById: 'u1',
        refundAmount: '100',
        paymentMethod: 'CASH',
        observation: 'x',
        order: {
          id: 'o1',
          orderNumber: 'OP-1',
          total: '500',
          paidAmount: '700',
          balance: '-200',
        },
      });
      prisma.user.findUnique.mockResolvedValue({
        role: {
          permissions: [{ permission: { name: 'approve_refunds' } }],
        },
      });
      prisma.cashSession.findFirst.mockResolvedValue(null);

      await expect(
        service.approve(requestId, reviewerId, {}),
      ).rejects.toThrow(BadRequestException);
    });

    it('approves: creates CashMovement, reduces paidAmount, updates request', async () => {
      prisma.refundRequest.findFirst.mockResolvedValue({
        id: requestId,
        orderId: 'o1',
        requestedById: 'u1',
        refundAmount: '100',
        paymentMethod: 'CASH',
        observation: 'cliente pagó de más',
        order: {
          id: 'o1',
          orderNumber: 'OP-1',
          total: '500',
          paidAmount: '700',
          balance: '-200',
        },
      });
      prisma.user.findUnique.mockResolvedValue({
        role: {
          permissions: [{ permission: { name: 'approve_refunds' } }],
        },
      });
      prisma.cashSession.findFirst.mockResolvedValue({ id: 'session-1' });
      prisma.cashMovement.create.mockResolvedValue({ id: 'mov-1' });
      prisma.order.update.mockResolvedValue({});
      prisma.refundRequest.update.mockResolvedValue({
        id: requestId,
        status: EditRequestStatus.APPROVED,
        orderId: 'o1',
      });

      const result = await service.approve(requestId, reviewerId, {
        reviewNotes: 'OK',
      });

      expect(consecutives.generateNumber).toHaveBeenCalledWith('CASH_RECEIPT');
      expect(prisma.cashMovement.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            cashSessionId: 'session-1',
            movementType: 'EXPENSE',
            paymentMethod: 'CASH',
            referenceType: 'REFUND',
            referenceId: requestId,
            performedById: reviewerId,
          }),
        }),
      );
      expect(prisma.order.update).toHaveBeenCalledWith({
        where: { id: 'o1' },
        data: expect.objectContaining({
          paidAmount: expect.anything(),
          balance: expect.anything(),
        }),
      });
      expect(prisma.refundRequest.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: requestId },
          data: expect.objectContaining({
            status: EditRequestStatus.APPROVED,
            reviewedById: reviewerId,
            cashMovementId: 'mov-1',
          }),
        }),
      );
      expect(notifications.create).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'REFUND_REQUEST_APPROVED',
          userId: 'u1',
        }),
      );
      expect(wsGateway.emitApprovalUpdated).toHaveBeenCalled();
      expect(result.status).toBe(EditRequestStatus.APPROVED);
    });
  });

  describe('reject', () => {
    const reviewerId = 'reviewer-1';
    const requestId = 'req-1';

    it('throws NotFoundException if request not found or not pending', async () => {
      prisma.refundRequest.findFirst.mockResolvedValue(null);
      await expect(
        service.reject(requestId, reviewerId, { reviewNotes: 'No' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('rejects request and notifies requester', async () => {
      prisma.refundRequest.findFirst.mockResolvedValue({
        id: requestId,
        orderId: 'o1',
        requestedById: 'u1',
        order: { id: 'o1', orderNumber: 'OP-1' },
      });
      prisma.user.findUnique.mockResolvedValue({
        role: {
          permissions: [{ permission: { name: 'approve_refunds' } }],
        },
      });
      prisma.refundRequest.update.mockResolvedValue({});
      prisma.refundRequest.findUnique.mockResolvedValue({
        id: requestId,
        status: EditRequestStatus.REJECTED,
      });

      const result = await service.reject(requestId, reviewerId, {
        reviewNotes: 'No aplica',
      });

      expect(prisma.refundRequest.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: requestId },
          data: expect.objectContaining({
            status: EditRequestStatus.REJECTED,
            reviewedById: reviewerId,
            reviewNotes: 'No aplica',
          }),
        }),
      );
      expect(notifications.create).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'REFUND_REQUEST_REJECTED',
          userId: 'u1',
        }),
      );
      expect(prisma.cashMovement.create).not.toHaveBeenCalled();
      expect(prisma.order.update).not.toHaveBeenCalled();
      expect(result?.status).toBe(EditRequestStatus.REJECTED);
    });
  });

  describe('WhatsApp delegates', () => {
    it('approveViaWhatsApp delegates to approve with fixed note', async () => {
      const approveSpy = jest
        .spyOn(service, 'approve')
        .mockResolvedValue({} as any);
      await service.approveViaWhatsApp('req-1', 'rev-1');
      expect(approveSpy).toHaveBeenCalledWith('req-1', 'rev-1', {
        reviewNotes: 'Aprobado vía WhatsApp',
      });
    });

    it('rejectViaWhatsApp delegates to reject with fixed note', async () => {
      const rejectSpy = jest
        .spyOn(service, 'reject')
        .mockResolvedValue({} as any);
      await service.rejectViaWhatsApp('req-1', 'rev-1');
      expect(rejectSpy).toHaveBeenCalledWith('req-1', 'rev-1', {
        reviewNotes: 'Rechazado vía WhatsApp',
      });
    });
  });

  describe('findPendingRequest', () => {
    it('returns null when request not found', async () => {
      prisma.refundRequest.findUnique.mockResolvedValue(null);
      const result = await service.findPendingRequest('missing');
      expect(result).toBeNull();
    });

    it('returns approval info when found', async () => {
      prisma.refundRequest.findUnique.mockResolvedValue({
        id: 'req-1',
        status: EditRequestStatus.PENDING,
        requestedById: 'u1',
        order: { orderNumber: 'OP-9' },
      });

      const result = await service.findPendingRequest('req-1');
      expect(result).toEqual({
        id: 'req-1',
        status: EditRequestStatus.PENDING,
        requestedById: 'u1',
        displayLabel: 'solicitud de devolución - Orden OP-9',
      });
    });
  });
});
