import { Test, TestingModule } from '@nestjs/testing';
import {
  ApprovalExpiryService,
  APPROVAL_EXPIRY_DAYS,
} from './approval-expiry.service';
import { PrismaService } from '../../database/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { EditRequestStatus, NotificationType } from '../../generated/prisma';

describe('ApprovalExpiryService', () => {
  let service: ApprovalExpiryService;
  let prisma: any;
  let notifications: { create: jest.Mock };

  /** Delegate vacío: findMany sin resultados, para los tipos que no interesan al test. */
  const emptyDelegate = () => ({
    findMany: jest.fn().mockResolvedValue([]),
    updateMany: jest.fn().mockResolvedValue({ count: 0 }),
  });

  beforeEach(async () => {
    prisma = {
      orderEditRequest: emptyDelegate(),
      orderStatusChangeRequest: emptyDelegate(),
      expenseOrderAuthRequest: emptyDelegate(),
      advancePaymentApproval: emptyDelegate(),
      clientOwnershipAuthRequest: emptyDelegate(),
      discountApproval: emptyDelegate(),
      paymentEditApproval: emptyDelegate(),
      refundRequest: emptyDelegate(),
      accountPayableAuthRequest: emptyDelegate(),
      cashMovementVoidRequest: emptyDelegate(),
      clientAdvisorRequest: emptyDelegate(),
      advisorChangeRequest: emptyDelegate(),
      order: { updateMany: jest.fn().mockResolvedValue({ count: 0 }) },
    };

    notifications = { create: jest.fn().mockResolvedValue(undefined) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ApprovalExpiryService,
        { provide: PrismaService, useValue: prisma },
        { provide: NotificationsService, useValue: notifications },
      ],
    }).compile();

    service = module.get(ApprovalExpiryService);
  });

  it('no hace nada cuando no hay solicitudes viejas', async () => {
    await service.expireStaleRequests();

    expect(prisma.expenseOrderAuthRequest.updateMany).not.toHaveBeenCalled();
    expect(notifications.create).not.toHaveBeenCalled();
  });

  it('marca EXPIRED las solicitudes anteriores al corte', async () => {
    prisma.expenseOrderAuthRequest.findMany.mockResolvedValue([
      { id: 'req-1', requestedById: 'user-1' },
      { id: 'req-2', requestedById: 'user-2' },
    ]);

    await service.expireStaleRequests();

    expect(prisma.expenseOrderAuthRequest.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ['req-1', 'req-2'] } },
      data: expect.objectContaining({ status: EditRequestStatus.EXPIRED }),
    });
  });

  // El corte se trunca al día, así que lo creado hoy nunca entra al barrido.
  it('consulta con un corte de hace APPROVAL_EXPIRY_DAYS días a medianoche', async () => {
    await service.expireStaleRequests();

    const where = prisma.expenseOrderAuthRequest.findMany.mock.calls[0][0].where;
    const cutoff: Date = where.createdAt.lt;

    const esperado = new Date();
    esperado.setHours(0, 0, 0, 0);
    esperado.setDate(esperado.getDate() - APPROVAL_EXPIRY_DAYS);

    expect(where.status).toBe(EditRequestStatus.PENDING);
    expect(cutoff.getTime()).toBe(esperado.getTime());
    expect(cutoff.getHours()).toBe(0);
  });

  it('avisa al solicitante de cada solicitud vencida', async () => {
    prisma.expenseOrderAuthRequest.findMany.mockResolvedValue([
      { id: 'req-1', requestedById: 'user-1' },
    ]);

    await service.expireStaleRequests();

    expect(notifications.create).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-1',
        type: NotificationType.APPROVAL_REQUEST_EXPIRED,
      }),
    );
  });

  // Si el campo espejo se queda en PENDING, `updateStatus()` bloquea la orden
  // para siempre contra una solicitud que ya nadie puede aprobar.
  describe('campos espejo en la orden', () => {
    it('libera la orden al vencer una aprobación de anticipo', async () => {
      prisma.advancePaymentApproval.findMany.mockResolvedValue([
        { id: 'ap-1', requestedById: 'user-1', orderId: 'order-1' },
        { id: 'ap-2', requestedById: 'user-2', orderId: 'order-1' },
      ]);

      await service.expireStaleRequests();

      expect(prisma.order.updateMany).toHaveBeenCalledWith({
        where: { id: { in: ['order-1'] } },
        data: { advancePaymentStatus: EditRequestStatus.EXPIRED },
      });
    });

    it('libera la orden al vencer una autorización de propiedad de cliente', async () => {
      prisma.clientOwnershipAuthRequest.findMany.mockResolvedValue([
        { id: 'co-1', requestedById: 'user-1', orderId: 'order-9' },
      ]);

      await service.expireStaleRequests();

      expect(prisma.order.updateMany).toHaveBeenCalledWith({
        where: { id: { in: ['order-9'] } },
        data: { clientOwnershipAuthStatus: EditRequestStatus.EXPIRED },
      });
    });

    it('no toca órdenes para los tipos que no espejan estado', async () => {
      prisma.discountApproval.findMany.mockResolvedValue([
        { id: 'd-1', requestedById: 'user-1' },
      ]);

      await service.expireStaleRequests();

      expect(prisma.order.updateMany).not.toHaveBeenCalled();
    });
  });

  it('un tipo que falla no impide barrer los demás', async () => {
    prisma.expenseOrderAuthRequest.findMany.mockRejectedValue(new Error('DB caída'));
    prisma.discountApproval.findMany.mockResolvedValue([
      { id: 'd-1', requestedById: 'user-1' },
    ]);

    await expect(service.expireStaleRequests()).resolves.toBeUndefined();

    expect(prisma.discountApproval.updateMany).toHaveBeenCalled();
  });

  it('una notificación que falla no deja la solicitud sin vencer', async () => {
    prisma.expenseOrderAuthRequest.findMany.mockResolvedValue([
      { id: 'req-1', requestedById: 'user-1' },
    ]);
    notifications.create.mockRejectedValue(new Error('sin conexión'));

    await expect(service.expireStaleRequests()).resolves.toBeUndefined();

    expect(prisma.expenseOrderAuthRequest.updateMany).toHaveBeenCalled();
  });
});
