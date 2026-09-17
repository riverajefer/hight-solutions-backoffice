import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { QuoteRestoreRequestsService } from './quote-restore-requests.service';
import { PrismaService } from '../../database/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { WhatsappService } from '../whatsapp/whatsapp.service';
import { ApprovalRequestRegistry } from '../whatsapp/approval-request-registry';
import {
  createMockPrismaService,
  MockPrismaService,
} from '../../database/prisma.service.mock';

describe('QuoteRestoreRequestsService', () => {
  let service: QuoteRestoreRequestsService;
  let prisma: MockPrismaService;
  let notifications: { create: jest.Mock; notifyAllAdmins: jest.Mock };
  let whatsapp: { sendApprovalNotification: jest.Mock; getAdminPhones: jest.Mock };
  let registry: { register: jest.Mock };

  const REJECTED_QUOTE = {
    id: 'quote-1',
    quoteNumber: 'COT-2026-0319',
    status: 'REJECTED',
    createdById: 'advisor-1',
    rejectionReason: 'se cambio items y cantidad',
    rejectedAt: new Date('2026-09-16T17:50:50Z'),
    rejectedFromStatus: 'ACCEPTED',
  };

  const requesterWith = (roleName: string, permissions: string[] = []) => ({
    role: {
      name: roleName,
      permissions: permissions.map((name) => ({ permission: { name } })),
    },
  });

  const CREATED_REQUEST = {
    id: 'req-1',
    quoteId: 'quote-1',
    requestedById: 'advisor-1',
    restoreToStatus: 'ACCEPTED',
    requestedBy: { firstName: 'Laura', lastName: 'Díaz', email: 'l@x.com' },
    quote: { id: 'quote-1', quoteNumber: 'COT-2026-0319', status: 'REJECTED' },
  };

  beforeEach(async () => {
    prisma = createMockPrismaService();
    notifications = { create: jest.fn(), notifyAllAdmins: jest.fn() };
    whatsapp = {
      sendApprovalNotification: jest.fn().mockResolvedValue(undefined),
      getAdminPhones: jest.fn().mockResolvedValue(['573212016229']),
    };
    registry = { register: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QuoteRestoreRequestsService,
        { provide: PrismaService, useValue: prisma },
        { provide: NotificationsService, useValue: notifications },
        { provide: WhatsappService, useValue: whatsapp },
        { provide: ApprovalRequestRegistry, useValue: registry },
      ],
    }).compile();

    service = module.get(QuoteRestoreRequestsService);
    // tx === prisma: los métodos del tx se controlan con el mismo mock
    prisma.$transaction.mockImplementation((fn: any) => fn(prisma));
  });

  it('registra su handler de WhatsApp al iniciar', () => {
    service.onModuleInit();
    expect(registry.register).toHaveBeenCalledWith('QUOTE_RESTORE', service);
  });

  describe('create', () => {
    beforeEach(() => {
      prisma.quote.findUnique.mockResolvedValue(REJECTED_QUOTE);
      prisma.quoteRestoreRequest.findFirst.mockResolvedValue(null);
      prisma.quoteRestoreRequest.create.mockResolvedValue(CREATED_REQUEST);
    });

    it('crea la solicitud con el estado de origen y notifica a los admins', async () => {
      prisma.user.findUnique.mockResolvedValue(requesterWith('asesor'));

      await service.create('advisor-1', {
        quoteId: 'quote-1',
        reason: 'Se rechazó por error',
      });

      const data = prisma.quoteRestoreRequest.create.mock.calls[0][0].data;
      expect(data).toMatchObject({
        quoteId: 'quote-1',
        requestedById: 'advisor-1',
        restoreToStatus: 'ACCEPTED',
        previousRejectionReason: 'se cambio items y cantidad',
        status: 'PENDING',
      });
      expect(notifications.notifyAllAdmins).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'QUOTE_RESTORE_REQUEST_PENDING',
          relatedType: 'Quote',
        }),
      );
      await new Promise((r) => setImmediate(r));
      expect(whatsapp.sendApprovalNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          requestId: 'req-1',
          requestType: 'QUOTE_RESTORE',
        }),
      );
    });

    it('restaura a Enviada cuando no se conoce el estado de origen', async () => {
      prisma.quote.findUnique.mockResolvedValue({
        ...REJECTED_QUOTE,
        rejectedFromStatus: null,
      });
      prisma.user.findUnique.mockResolvedValue(requesterWith('asesor'));

      await service.create('advisor-1', { quoteId: 'quote-1', reason: 'Se rechazó por error' });

      expect(
        prisma.quoteRestoreRequest.create.mock.calls[0][0].data.restoreToStatus,
      ).toBe('SENT');
    });

    it('rechaza cotizaciones que no están rechazadas', async () => {
      prisma.quote.findUnique.mockResolvedValue({ ...REJECTED_QUOTE, status: 'SENT' });

      await expect(
        service.create('advisor-1', { quoteId: 'quote-1', reason: 'Se rechazó por error' }),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.quoteRestoreRequest.create).not.toHaveBeenCalled();
    });

    it('no permite pedirla sobre la cotización de otro asesor sin read_all_quotes', async () => {
      prisma.user.findUnique.mockResolvedValue(requesterWith('asesor'));

      await expect(
        service.create('otro-asesor', { quoteId: 'quote-1', reason: 'Se rechazó por error' }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('permite pedirla sobre otra cotización con read_all_quotes', async () => {
      prisma.user.findUnique.mockResolvedValue(
        requesterWith('manager', ['read_all_quotes']),
      );

      await service.create('manager-1', { quoteId: 'quote-1', reason: 'Se rechazó por error' });

      expect(prisma.quoteRestoreRequest.create).toHaveBeenCalled();
    });

    it('los admins no crean solicitudes', async () => {
      prisma.user.findUnique.mockResolvedValue(requesterWith('admin'));

      await expect(
        service.create('admin-1', { quoteId: 'quote-1', reason: 'Se rechazó por error' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('no crea una segunda solicitud pendiente', async () => {
      prisma.user.findUnique.mockResolvedValue(requesterWith('asesor'));
      prisma.quoteRestoreRequest.findFirst.mockResolvedValue({ id: 'req-0' });

      await expect(
        service.create('advisor-1', { quoteId: 'quote-1', reason: 'Se rechazó por error' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('approve', () => {
    beforeEach(() => {
      prisma.user.findUnique.mockResolvedValue({ id: 'admin-1', role: { name: 'admin' } });
      prisma.quoteRestoreRequest.updateMany.mockResolvedValue({ count: 1 });
      prisma.quoteRestoreRequest.findUniqueOrThrow
        .mockResolvedValueOnce({ quoteId: 'quote-1', restoreToStatus: 'ACCEPTED' })
        .mockResolvedValueOnce({ ...CREATED_REQUEST, status: 'APPROVED' });
      prisma.quote.findUnique.mockResolvedValue({ status: 'REJECTED' });
    });

    it('restaura la cotización y limpia el rechazo', async () => {
      await service.approve('req-1', 'admin-1', {});

      expect(prisma.quoteRestoreRequest.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'req-1', status: 'PENDING' },
          data: expect.objectContaining({ status: 'APPROVED', reviewedById: 'admin-1' }),
        }),
      );
      expect(prisma.quote.update).toHaveBeenCalledWith({
        where: { id: 'quote-1' },
        data: {
          status: 'ACCEPTED',
          rejectionReason: null,
          rejectedAt: null,
          rejectedFromStatus: null,
        },
      });
      expect(notifications.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'advisor-1',
          type: 'QUOTE_RESTORE_REQUEST_APPROVED',
        }),
      );
    });

    it('falla si la solicitud ya fue procesada', async () => {
      prisma.quoteRestoreRequest.updateMany.mockResolvedValue({ count: 0 });

      await expect(service.approve('req-1', 'admin-1', {})).rejects.toThrow(
        NotFoundException,
      );
      expect(prisma.quote.update).not.toHaveBeenCalled();
    });

    it('falla si la cotización ya no está rechazada', async () => {
      prisma.quote.findUnique.mockResolvedValue({ status: 'SENT' });

      await expect(service.approve('req-1', 'admin-1', {})).rejects.toThrow(
        BadRequestException,
      );
      expect(prisma.quote.update).not.toHaveBeenCalled();
    });

    it('solo los admins aprueban', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'u', role: { name: 'manager' } });

      await expect(service.approve('req-1', 'u', {})).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('la aprobación por WhatsApp usa el mismo camino', async () => {
      await service.approveViaWhatsApp('req-1', 'admin-1');

      expect(prisma.quote.update).toHaveBeenCalled();
      expect(prisma.quoteRestoreRequest.updateMany.mock.calls[0][0].data.reviewNotes).toBe(
        'Aprobado vía WhatsApp',
      );
    });
  });

  describe('reject', () => {
    it('marca la solicitud como rechazada sin tocar la cotización', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'admin-1', role: { name: 'admin' } });
      prisma.quoteRestoreRequest.findFirst.mockResolvedValue({
        ...CREATED_REQUEST,
        quote: { quoteNumber: 'COT-2026-0319' },
      });
      prisma.quoteRestoreRequest.update.mockResolvedValue({});

      await service.reject('req-1', 'admin-1', { reviewNotes: 'El cliente no sigue' });

      expect(prisma.quoteRestoreRequest.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'REJECTED' }),
        }),
      );
      expect(prisma.quote.update).not.toHaveBeenCalled();
      expect(notifications.create).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'QUOTE_RESTORE_REQUEST_REJECTED' }),
      );
    });
  });

  describe('restoreDirectly', () => {
    it('restaura, cierra pendientes y deja traza aprobada', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'admin-1', role: { name: 'admin' } });
      prisma.quote.findUnique.mockResolvedValue(REJECTED_QUOTE);
      prisma.quoteRestoreRequest.updateMany.mockResolvedValue({ count: 1 });
      prisma.quoteRestoreRequest.create.mockResolvedValue({});

      await service.restoreDirectly('admin-1', {
        quoteId: 'quote-1',
        reason: 'Rechazada por error',
      });

      expect(prisma.quote.update.mock.calls[0][0].data.status).toBe('ACCEPTED');
      expect(prisma.quoteRestoreRequest.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { quoteId: 'quote-1', status: 'PENDING' },
        }),
      );
      expect(prisma.quoteRestoreRequest.create.mock.calls[0][0].data).toMatchObject({
        status: 'APPROVED',
        reviewedById: 'admin-1',
        restoreToStatus: 'ACCEPTED',
      });
    });
  });

  describe('findPendingRequests', () => {
    it('solo lista las de cotizaciones que siguen rechazadas', async () => {
      prisma.quoteRestoreRequest.findMany.mockResolvedValue([]);

      await service.findPendingRequests();

      expect(prisma.quoteRestoreRequest.findMany.mock.calls[0][0].where).toMatchObject({
        status: 'PENDING',
        quote: { status: 'REJECTED' },
      });
    });
  });
});
