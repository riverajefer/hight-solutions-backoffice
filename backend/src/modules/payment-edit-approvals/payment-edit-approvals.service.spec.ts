// uuid v9+ es ESM-only y rompe Jest; debe mockearse antes de los imports
// porque StorageService lo importa transitivamente.
jest.mock('uuid', () => ({ v4: jest.fn(() => 'mock-uuid') }));

import { Test, TestingModule } from '@nestjs/testing';
import { PaymentEditApprovalsService } from './payment-edit-approvals.service';
import { PrismaService } from '../../database/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { ApprovalRequestRegistry } from '../whatsapp/approval-request-registry';
import { WhatsappService } from '../whatsapp/whatsapp.service';
import { WsEventsGateway } from '../ws-events/ws-events.gateway';
import { StorageService } from '../storage/storage.service';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { EditRequestStatus, Prisma } from '../../generated/prisma';

describe('PaymentEditApprovalsService', () => {
  let service: PaymentEditApprovalsService;
  let prisma: any;
  let notificationsService: any;
  let wsEventsGateway: any;
  let storageService: any;

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
      payment: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
      },
      cashMovement: {
        update: jest.fn(),
      },
      paymentEditApproval: {
        create: jest.fn(),
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
      },
      $transaction: jest.fn(),
    };
    // tx === prisma para controlar tx.model.method con el mismo mock
    prisma.$transaction.mockImplementation((fn: any) => fn(prisma));

    notificationsService = {
      notifyUsersWithPermission: jest.fn(),
      create: jest.fn(),
    };
    wsEventsGateway = {
      emitApprovalCreated: jest.fn(),
      emitApprovalUpdated: jest.fn(),
    };
    storageService = {
      uploadFile: jest.fn(),
      deleteFile: jest.fn(),
      hardDeleteFile: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentEditApprovalsService,
        { provide: PrismaService, useValue: prisma },
        { provide: NotificationsService, useValue: notificationsService },
        { provide: ApprovalRequestRegistry, useValue: { register: jest.fn() } },
        {
          provide: WhatsappService,
          useValue: { sendApprovalNotification: jest.fn() },
        },
        { provide: WsEventsGateway, useValue: wsEventsGateway },
        { provide: StorageService, useValue: storageService },
      ],
    }).compile();

    service = module.get<PaymentEditApprovalsService>(
      PaymentEditApprovalsService,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('requiresApproval', () => {
    it('returns required:false when user has approve_payment_edits', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'u1',
        role: { permissions: [{ permission: { name: 'approve_payment_edits' } }] },
      });
      expect(await service.requiresApproval('u1')).toEqual({ required: false });
    });

    it('returns required:true when user lacks permission', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'u1',
        role: { permissions: [] },
      });
      const result = await service.requiresApproval('u1');
      expect(result.required).toBe(true);
      expect(result.reason).toBeDefined();
    });
  });

  describe('createRequest', () => {
    it('creates a PENDING request with the new payload and does NOT touch the payment/order totals', async () => {
      prisma.order.findUnique.mockResolvedValue({ id: 'o1', orderNumber: 'OP-1' });
      prisma.user.findUnique.mockResolvedValue({ id: 'u1', firstName: 'Ana' });
      prisma.payment.findUnique.mockResolvedValue({
        id: 'p1',
        amount: new Prisma.Decimal(258000),
        paymentMethod: 'TRANSFER',
        paymentDate: new Date('2026-05-11'),
        reference: null,
        notes: null,
      });
      prisma.paymentEditApproval.findFirst.mockResolvedValue(null);
      prisma.paymentEditApproval.create.mockResolvedValue({ id: 'req1' });

      await service.createRequest('o1', 'p1', 'u1', { amount: 107000 });

      // No se modifica el pago ni se recalculan totales
      expect(prisma.payment.update).not.toHaveBeenCalled();
      expect(prisma.order.update).not.toHaveBeenCalled();

      const createArg = prisma.paymentEditApproval.create.mock.calls[0][0];
      expect(createArg.data.status).toBe(EditRequestStatus.PENDING);
      expect(Number(createArg.data.newAmount.toString())).toBe(107000);
      expect(Number(createArg.data.oldAmount.toString())).toBe(258000);
      expect(notificationsService.notifyUsersWithPermission).toHaveBeenCalled();
    });

    it('does not duplicate a pending request for the same payment', async () => {
      prisma.order.findUnique.mockResolvedValue({ id: 'o1', orderNumber: 'OP-1' });
      prisma.user.findUnique.mockResolvedValue({ id: 'u1' });
      prisma.payment.findUnique.mockResolvedValue({
        id: 'p1',
        amount: new Prisma.Decimal(100),
        paymentMethod: 'CASH',
        paymentDate: new Date(),
        reference: null,
        notes: null,
      });
      prisma.paymentEditApproval.findFirst.mockResolvedValue({ id: 'existing' });
      prisma.paymentEditApproval.findUnique.mockResolvedValue({ id: 'existing' });

      await service.createRequest('o1', 'p1', 'u1', { amount: 200 });
      expect(prisma.paymentEditApproval.create).not.toHaveBeenCalled();
    });
  });

  describe('approve', () => {
    it('applies the new payload to the payment and recalculates paidAmount/balance', async () => {
      // validateReviewerPermission
      prisma.user.findUnique.mockResolvedValue({
        id: 'rev',
        role: { permissions: [{ permission: { name: 'approve_payment_edits' } }] },
      });
      prisma.paymentEditApproval.findFirst.mockResolvedValue({
        id: 'req1',
        orderId: 'o1',
        paymentId: 'p1',
        requestedById: 'u1',
        status: EditRequestStatus.PENDING,
        newAmount: new Prisma.Decimal(107000),
        newPaymentMethod: null,
        newPaymentDate: null,
        newReference: null,
        newNotes: null,
        order: { id: 'o1', orderNumber: 'OP-1' },
      });
      prisma.payment.update.mockResolvedValue({
        id: 'p1',
        amount: new Prisma.Decimal(107000),
        paymentMethod: 'TRANSFER',
        cashMovementId: null,
      });
      prisma.payment.findMany.mockResolvedValue([
        { amount: new Prisma.Decimal(107000) },
      ]);
      prisma.order.findUnique.mockResolvedValue({ total: new Prisma.Decimal(150000) });
      prisma.paymentEditApproval.update.mockResolvedValue({ id: 'req1' });

      await service.approve('req1', 'rev', {});

      // El pago se actualiza con el nuevo monto
      const payUpdate = prisma.payment.update.mock.calls[0][0];
      expect(Number(payUpdate.data.amount.toString())).toBe(107000);

      // Se recalcula (no se suma): paidAmount=107000, balance=150000-107000
      const orderUpdate = prisma.order.update.mock.calls.find(
        (c: any) => c[0].data.paidAmount !== undefined,
      )[0];
      expect(Number(orderUpdate.data.paidAmount.toString())).toBe(107000);
      expect(Number(orderUpdate.data.balance.toString())).toBe(43000);
    });

    it('links the proposed receipt to the payment and deletes the previous one', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'rev',
        role: { permissions: [{ permission: { name: 'approve_payment_edits' } }] },
      });
      prisma.paymentEditApproval.findFirst.mockResolvedValue({
        id: 'req1',
        orderId: 'o1',
        paymentId: 'p1',
        requestedById: 'u1',
        status: EditRequestStatus.PENDING,
        newAmount: null,
        newPaymentMethod: null,
        newPaymentDate: null,
        newReference: null,
        newNotes: null,
        oldReceiptFileId: 'old-file',
        newReceiptFileId: 'new-file',
        order: { id: 'o1', orderNumber: 'OP-1' },
      });
      prisma.payment.update.mockResolvedValue({
        id: 'p1',
        amount: new Prisma.Decimal(100),
        paymentMethod: 'CASH',
        cashMovementId: null,
      });
      prisma.payment.findMany.mockResolvedValue([
        { amount: new Prisma.Decimal(100) },
      ]);
      prisma.order.findUnique.mockResolvedValue({ total: new Prisma.Decimal(100) });
      prisma.paymentEditApproval.update.mockResolvedValue({ id: 'req1' });

      await service.approve('req1', 'rev', {});

      const payUpdate = prisma.payment.update.mock.calls[0][0];
      expect(payUpdate.data.receiptFileId).toBe('new-file');
      expect(storageService.deleteFile).toHaveBeenCalledWith('old-file', 'rev');
    });

    it('throws if reviewer lacks permission', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'rev',
        role: { permissions: [] },
      });
      await expect(service.approve('req1', 'rev', {})).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('throws NotFound if request is not pending', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'rev',
        role: { permissions: [{ permission: { name: 'approve_payment_edits' } }] },
      });
      prisma.paymentEditApproval.findFirst.mockResolvedValue(null);
      await expect(service.approve('req1', 'rev', {})).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('reject', () => {
    it('marks REJECTED and does NOT modify the payment', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'rev',
        role: { permissions: [{ permission: { name: 'approve_payment_edits' } }] },
      });
      prisma.paymentEditApproval.findFirst.mockResolvedValue({
        id: 'req1',
        orderId: 'o1',
        paymentId: 'p1',
        requestedById: 'u1',
        status: EditRequestStatus.PENDING,
        order: { id: 'o1', orderNumber: 'OP-1' },
      });
      prisma.paymentEditApproval.update.mockResolvedValue({
        id: 'req1',
        status: EditRequestStatus.REJECTED,
      });

      await service.reject('req1', 'rev', { reviewNotes: 'No corresponde' });

      expect(prisma.payment.update).not.toHaveBeenCalled();
      expect(prisma.order.update).not.toHaveBeenCalled();
      const updateArg = prisma.paymentEditApproval.update.mock.calls[0][0];
      expect(updateArg.data.status).toBe(EditRequestStatus.REJECTED);
    });

    it('hard-deletes the orphaned proposed receipt on rejection', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'rev',
        role: { permissions: [{ permission: { name: 'approve_payment_edits' } }] },
      });
      prisma.paymentEditApproval.findFirst.mockResolvedValue({
        id: 'req1',
        orderId: 'o1',
        paymentId: 'p1',
        requestedById: 'u1',
        status: EditRequestStatus.PENDING,
        newReceiptFileId: 'orphan-file',
        order: { id: 'o1', orderNumber: 'OP-1' },
      });
      prisma.paymentEditApproval.update.mockResolvedValue({
        id: 'req1',
        status: EditRequestStatus.REJECTED,
      });

      await service.reject('req1', 'rev', {});
      expect(storageService.hardDeleteFile).toHaveBeenCalledWith('orphan-file');
    });
  });
});
