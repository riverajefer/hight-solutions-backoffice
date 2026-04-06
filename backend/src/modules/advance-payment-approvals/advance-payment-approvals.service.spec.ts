import { Test, TestingModule } from '@nestjs/testing';
import { AdvancePaymentApprovalsService } from './advance-payment-approvals.service';
import { PrismaService } from '../../database/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { ApprovalRequestRegistry } from '../whatsapp/approval-request-registry';
import { WhatsappService } from '../whatsapp/whatsapp.service';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { EditRequestStatus, NotificationType, Prisma } from '../../generated/prisma';

describe('AdvancePaymentApprovalsService', () => {
  let service: AdvancePaymentApprovalsService;
  let prisma: jest.Mocked<PrismaService>;
  let notificationsService: jest.Mocked<NotificationsService>;

  beforeEach(async () => {
    prisma = {
      user: {
        findUnique: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
      },
      order: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      advancePaymentApproval: {
        create: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
      },
      payment: {
        delete: jest.fn(),
        findUnique: jest.fn(),
      },
    } as any;

    notificationsService = {
      notifyUsersWithPermission: jest.fn(),
      create: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdvancePaymentApprovalsService,
        { provide: PrismaService, useValue: prisma },
        { provide: NotificationsService, useValue: notificationsService },
        { provide: ApprovalRequestRegistry, useValue: { register: jest.fn() } },
        { provide: WhatsappService, useValue: { sendApprovalNotification: jest.fn() } },
      ],
    }).compile();

    service = module.get<AdvancePaymentApprovalsService>(AdvancePaymentApprovalsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('requiresApproval', () => {
    it('should return required false if user has permission', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'u1',
        role: {
          permissions: [{ permission: { name: 'approve_advance_payments' } }],
        },
      } as any);

      const result = await service.requiresApproval('u1');
      expect(result).toEqual({ required: false });
    });

    it('should return required true if user does not have permission', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'u1',
        role: { permissions: [] },
      } as any);

      const result = await service.requiresApproval('u1');
      expect(result.required).toBe(true);
      expect(result.reason).toBeDefined();
    });
  });

  describe('createFromOrderCreation', () => {
    it('should create approval request', async () => {
      (prisma.order.findUnique as jest.Mock).mockResolvedValue({ id: 'o1', orderNumber: '123' } as any);
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({ id: 'u1', firstName: 'John' } as any);
      (prisma.advancePaymentApproval.create as jest.Mock).mockResolvedValue({ id: 'req1' } as any);

      const result = await service.createFromOrderCreation('u1', 'o1', 'pay1');

      expect(prisma.advancePaymentApproval.create).toHaveBeenCalled();
      expect(prisma.order.update).toHaveBeenCalledWith({
        where: { id: 'o1' },
        data: { advancePaymentStatus: EditRequestStatus.PENDING },
      });
      expect(notificationsService.notifyUsersWithPermission).toHaveBeenCalled();
      expect(result.id).toBe('req1');
    });

    it('should throw NotFoundException if order not found', async () => {
      (prisma.order.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.createFromOrderCreation('u1', 'o1', 'pay1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('approve', () => {
    it('should approve a request and update order', async () => {
      (prisma.advancePaymentApproval.findFirst as jest.Mock).mockResolvedValue({
        id: 'req1',
        orderId: 'o1',
        requestedById: 'u1',
        order: { orderNumber: '123' },
      } as any);
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        role: { permissions: [{ permission: { name: 'approve_advance_payments' } }] },
      } as any);
      (prisma.advancePaymentApproval.update as jest.Mock).mockResolvedValue({ id: 'req1', status: EditRequestStatus.APPROVED } as any);

      const result = await service.approve('req1', 'rev1', { reviewNotes: 'OK' });

      expect(prisma.advancePaymentApproval.update).toHaveBeenCalled();
      expect(prisma.order.update).toHaveBeenCalledWith({
        where: { id: 'o1' },
        data: { advancePaymentStatus: EditRequestStatus.APPROVED },
      });
      expect(notificationsService.create).toHaveBeenCalled();
      expect(result.status).toBe(EditRequestStatus.APPROVED);
    });

    it('should throw NotFoundException if request not found', async () => {
      (prisma.advancePaymentApproval.findFirst as jest.Mock).mockResolvedValue(null);
      await expect(service.approve('req1', 'rev1', {})).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if reviewer lacks permission', async () => {
      (prisma.advancePaymentApproval.findFirst as jest.Mock).mockResolvedValue({
        id: 'req1',
      } as any);
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        role: { permissions: [] },
      } as any);

      await expect(service.approve('req1', 'rev1', {})).rejects.toThrow(ForbiddenException);
    });
  });

  describe('reject', () => {
    it('should reject a request, delete payment and update order balance', async () => {
      (prisma.advancePaymentApproval.findFirst as jest.Mock).mockResolvedValue({
        id: 'req1',
        orderId: 'o1',
        paymentId: 'pay1',
        requestedById: 'u1',
        order: { orderNumber: '123', total: 1000 },
      } as any);
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        role: { permissions: [{ permission: { name: 'approve_advance_payments' } }] },
      } as any);
      (prisma.advancePaymentApproval.findUnique as jest.Mock).mockResolvedValue({ id: 'req1', status: EditRequestStatus.REJECTED } as any);

      const result = await service.reject('req1', 'rev1', { reviewNotes: 'No' });

      expect(prisma.advancePaymentApproval.update).toHaveBeenCalled();
      expect(prisma.payment.delete).toHaveBeenCalledWith({ where: { id: 'pay1' } });
      expect(prisma.order.update).toHaveBeenCalledWith({
        where: { id: 'o1' },
        data: {
          advancePaymentStatus: EditRequestStatus.REJECTED,
          paidAmount: new Prisma.Decimal(0),
          balance: new Prisma.Decimal(1000),
        },
      });
      expect(notificationsService.create).toHaveBeenCalled();
      expect(result?.status).toBe(EditRequestStatus.REJECTED);
    });

    it('should throw NotFoundException if request not found', async () => {
      (prisma.advancePaymentApproval.findFirst as jest.Mock).mockResolvedValue(null);
      await expect(service.reject('req1', 'rev1', {})).rejects.toThrow(NotFoundException);
    });
  });

  describe('find pending, all, my', () => {
    it('should findPendingRequests', async () => {
      (prisma.advancePaymentApproval.findMany as jest.Mock).mockResolvedValue([{ id: '1' }] as any);
      expect(await service.findPendingRequests()).toEqual([{ id: '1' }]);
    });

    it('should findAll', async () => {
      (prisma.advancePaymentApproval.findMany as jest.Mock).mockResolvedValue([{ id: '1' }] as any);
      expect(await service.findAll()).toEqual([{ id: '1' }]);
    });

    it('should findByUser', async () => {
      (prisma.advancePaymentApproval.findMany as jest.Mock).mockResolvedValue([{ id: '1' }] as any);
      expect(await service.findByUser('user1')).toEqual([{ id: '1' }]);
    });
  });
});
