import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { OrderEditPermissionsExpireService } from './order-edit-permissions-expire.service';
import { PrismaService } from '../../../database/prisma.service';
import { NotificationsService } from '../../notifications/notifications.service';
import {
  createMockPrismaService,
  MockPrismaService,
} from '../../../database/prisma.service.mock';
import { EditRequestStatus } from '../../../generated/prisma';

// ---------------------------------------------------------------------------
// Mock: NotificationsService
// ---------------------------------------------------------------------------
const mockNotificationsService = {
  create: jest.fn(),
};

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------
const makeExpiredRequest = (id: string, userId: string, orderNumber: string) => ({
  id,
  orderId: `order-${id}`,
  requestedById: userId,
  status: EditRequestStatus.APPROVED,
  expiresAt: new Date(Date.now() - 10000), // 10s ago
  requestedBy: { id: userId, email: `${userId}@test.com`, firstName: 'U', lastName: 'S' },
  order: { id: `order-${id}`, orderNumber },
});

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------
describe('OrderEditPermissionsExpireService', () => {
  let service: OrderEditPermissionsExpireService;
  let prisma: MockPrismaService;

  beforeEach(async () => {
    prisma = createMockPrismaService();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrderEditPermissionsExpireService,
        { provide: PrismaService, useValue: prisma },
        { provide: NotificationsService, useValue: mockNotificationsService },
      ],
    }).compile();

    service = module.get<OrderEditPermissionsExpireService>(
      OrderEditPermissionsExpireService,
    );

    mockNotificationsService.create.mockResolvedValue(undefined);
  });

  afterEach(() => jest.clearAllMocks());

  // ---------------------------------------------------------------------------
  // expirePermissions
  // ---------------------------------------------------------------------------
  describe('expirePermissions', () => {
    it('should do nothing when no expired APPROVED requests exist', async () => {
      prisma.orderEditRequest.findMany.mockResolvedValue([]);

      await service.expirePermissions();

      expect(prisma.orderEditRequest.updateMany).not.toHaveBeenCalled();
      expect(mockNotificationsService.create).not.toHaveBeenCalled();
    });

    it('should query APPROVED requests with expiresAt <= now', async () => {
      prisma.orderEditRequest.findMany.mockResolvedValue([]);

      await service.expirePermissions();

      const whereArg = prisma.orderEditRequest.findMany.mock.calls[0][0].where;
      expect(whereArg.status).toBe(EditRequestStatus.APPROVED);
      expect(whereArg.expiresAt.lte).toBeInstanceOf(Date);
    });

    it('should call updateMany with EXPIRED status for all expired request IDs', async () => {
      const expired = [
        makeExpiredRequest('req-1', 'user-1', 'OP-001'),
        makeExpiredRequest('req-2', 'user-2', 'OP-002'),
      ];
      prisma.orderEditRequest.findMany.mockResolvedValue(expired);
      prisma.orderEditRequest.updateMany.mockResolvedValue({ count: 2 });

      await service.expirePermissions();

      expect(prisma.orderEditRequest.updateMany).toHaveBeenCalledWith({
        where: { id: { in: ['req-1', 'req-2'] } },
        data: { status: EditRequestStatus.EXPIRED },
      });
    });

    it('should send a notification to each user whose permission expired', async () => {
      const expired = [
        makeExpiredRequest('req-1', 'user-1', 'OP-001'),
        makeExpiredRequest('req-2', 'user-2', 'OP-002'),
      ];
      prisma.orderEditRequest.findMany.mockResolvedValue(expired);
      prisma.orderEditRequest.updateMany.mockResolvedValue({ count: 2 });

      await service.expirePermissions();

      expect(mockNotificationsService.create).toHaveBeenCalledTimes(2);
      expect(mockNotificationsService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-1',
          title: 'Permiso de edición expirado',
          message: expect.stringContaining('OP-001'),
        }),
      );
    });

    it('should continue notifying remaining users even if one notification fails', async () => {
      const loggerErrorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation();
      const expired = [
        makeExpiredRequest('req-1', 'user-1', 'OP-001'),
        makeExpiredRequest('req-2', 'user-2', 'OP-002'),
      ];
      prisma.orderEditRequest.findMany.mockResolvedValue(expired);
      prisma.orderEditRequest.updateMany.mockResolvedValue({ count: 2 });
      mockNotificationsService.create
        .mockRejectedValueOnce(new Error('Notification failed'))
        .mockResolvedValueOnce(undefined);

      await service.expirePermissions();

      // Despite the first notification failing, the second one was still attempted
      expect(mockNotificationsService.create).toHaveBeenCalledTimes(2);

      loggerErrorSpy.mockRestore();
    });
  });

  // ---------------------------------------------------------------------------
  // notifyExpiringPermissions
  // ---------------------------------------------------------------------------
  describe('notifyExpiringPermissions', () => {
    it('should do nothing when no permissions are expiring soon', async () => {
      prisma.orderEditRequest.findMany.mockResolvedValue([]);

      await service.notifyExpiringPermissions();

      expect(mockNotificationsService.create).not.toHaveBeenCalled();
    });

    it('should query APPROVED requests expiring within the next ~1 minute', async () => {
      prisma.orderEditRequest.findMany.mockResolvedValue([]);

      await service.notifyExpiringPermissions();

      const whereArg = prisma.orderEditRequest.findMany.mock.calls[0][0].where;
      expect(whereArg.status).toBe(EditRequestStatus.APPROVED);
      expect(whereArg.expiresAt.gte).toBeInstanceOf(Date);
      expect(whereArg.expiresAt.lte).toBeInstanceOf(Date);

      // The upper bound (lte) should be ~1 minute ahead of the lower bound (gte)
      const gapMs =
        whereArg.expiresAt.lte.getTime() - whereArg.expiresAt.gte.getTime();
      expect(gapMs).toBeGreaterThanOrEqual(50 * 1000); // at least 50s
      expect(gapMs).toBeLessThanOrEqual(70 * 1000);   // at most 70s
    });

    it('should send an expiring warning notification to each user', async () => {
      const expiringRequest = {
        ...makeExpiredRequest('req-1', 'user-1', 'OP-001'),
        expiresAt: new Date(Date.now() + 30 * 1000), // 30s from now
      };
      prisma.orderEditRequest.findMany.mockResolvedValue([expiringRequest]);

      await service.notifyExpiringPermissions();

      expect(mockNotificationsService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-1',
          title: 'Permiso de edición por expirar',
          message: expect.stringContaining('OP-001'),
        }),
      );
    });

    it('should continue notifying remaining users even if one notification fails', async () => {
      const loggerErrorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation();
      const expiring = [
        { ...makeExpiredRequest('req-1', 'user-1', 'OP-001'), expiresAt: new Date(Date.now() + 30000) },
        { ...makeExpiredRequest('req-2', 'user-2', 'OP-002'), expiresAt: new Date(Date.now() + 45000) },
      ];
      prisma.orderEditRequest.findMany.mockResolvedValue(expiring);
      mockNotificationsService.create
        .mockRejectedValueOnce(new Error('Notification failed'))
        .mockResolvedValueOnce(undefined);

      await service.notifyExpiringPermissions();

      expect(mockNotificationsService.create).toHaveBeenCalledTimes(2);

      loggerErrorSpy.mockRestore();
    });
  });
});
