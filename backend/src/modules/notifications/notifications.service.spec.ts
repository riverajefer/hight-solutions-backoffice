import { Test, TestingModule } from '@nestjs/testing';
import { NotificationsService } from './notifications.service';
import { PrismaService } from '../../database/prisma.service';
import {
  createMockPrismaService,
  MockPrismaService,
} from '../../database/prisma.service.mock';

describe('NotificationsService', () => {
  let service: NotificationsService;
  let prisma: MockPrismaService;

  beforeEach(async () => {
    prisma = createMockPrismaService();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
  });

  afterEach(() => jest.clearAllMocks());

  // ---------------------------------------------------------------------------
  // create
  // ---------------------------------------------------------------------------
  describe('create', () => {
    it('should call prisma.notification.create with the provided dto', async () => {
      const dto = {
        userId: 'user-1',
        title: 'Test',
        message: 'Test message',
        type: 'INFO',
      };
      const mockNotification = { id: 'notif-1', ...dto };
      prisma.notification.create.mockResolvedValue(mockNotification);

      const result = await service.create(dto as any);

      expect(prisma.notification.create).toHaveBeenCalledWith({ data: dto });
      expect(result).toEqual(mockNotification);
    });
  });

  // ---------------------------------------------------------------------------
  // findByUser
  // ---------------------------------------------------------------------------
  describe('findByUser', () => {
    const mockNotifs = [
      { id: 'notif-1', userId: 'user-1', isRead: false },
      { id: 'notif-2', userId: 'user-1', isRead: true },
    ];

    it('should return paginated notifications with meta for a user', async () => {
      prisma.notification.findMany.mockResolvedValue(mockNotifs);
      prisma.notification.count.mockResolvedValue(2);

      const result = await service.findByUser('user-1', { page: 1, limit: 20 });

      expect(result).toEqual({
        data: mockNotifs,
        total: 2,
        page: 1,
        limit: 20,
      });
    });

    it('should apply isRead filter when provided', async () => {
      prisma.notification.findMany.mockResolvedValue([mockNotifs[0]]);
      prisma.notification.count.mockResolvedValue(1);

      await service.findByUser('user-1', { page: 1, limit: 20, isRead: false });

      expect(prisma.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'user-1', isRead: false },
        }),
      );
      expect(prisma.notification.count).toHaveBeenCalledWith({
        where: { userId: 'user-1', isRead: false },
      });
    });

    it('should NOT apply isRead filter when not provided', async () => {
      prisma.notification.findMany.mockResolvedValue(mockNotifs);
      prisma.notification.count.mockResolvedValue(2);

      await service.findByUser('user-1', { page: 1, limit: 20 });

      expect(prisma.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'user-1' },
        }),
      );
    });

    it('should calculate skip correctly based on page and limit', async () => {
      prisma.notification.findMany.mockResolvedValue([]);
      prisma.notification.count.mockResolvedValue(0);

      await service.findByUser('user-1', { page: 3, limit: 10 });

      expect(prisma.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 20, // (3 - 1) * 10
          take: 10,
        }),
      );
    });

    it('should order notifications by createdAt descending', async () => {
      prisma.notification.findMany.mockResolvedValue([]);
      prisma.notification.count.mockResolvedValue(0);

      await service.findByUser('user-1', { page: 1, limit: 20 });

      expect(prisma.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { createdAt: 'desc' },
        }),
      );
    });

    it('should use defaults (page=1, limit=20) when not specified in filters', async () => {
      prisma.notification.findMany.mockResolvedValue([]);
      prisma.notification.count.mockResolvedValue(0);

      const result = await service.findByUser('user-1', {});

      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
      expect(prisma.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 0, take: 20 }),
      );
    });
  });

  // ---------------------------------------------------------------------------
  // countUnread
  // ---------------------------------------------------------------------------
  describe('countUnread', () => {
    it('should return the count of unread notifications for the user', async () => {
      prisma.notification.count.mockResolvedValue(5);

      const result = await service.countUnread('user-1');

      expect(prisma.notification.count).toHaveBeenCalledWith({
        where: { userId: 'user-1', isRead: false },
      });
      expect(result).toBe(5);
    });
  });

  // ---------------------------------------------------------------------------
  // markAsRead
  // ---------------------------------------------------------------------------
  describe('markAsRead', () => {
    it('should call updateMany with correct where clause and set isRead=true', async () => {
      prisma.notification.updateMany.mockResolvedValue({ count: 1 });

      await service.markAsRead('notif-1', 'user-1');

      const call = prisma.notification.updateMany.mock.calls[0][0];
      expect(call.where).toEqual({ id: 'notif-1', userId: 'user-1' });
      expect(call.data.isRead).toBe(true);
      expect(call.data.readAt).toBeInstanceOf(Date);
    });
  });

  // ---------------------------------------------------------------------------
  // markAllAsRead
  // ---------------------------------------------------------------------------
  describe('markAllAsRead', () => {
    it('should call updateMany for all unread notifications of the user', async () => {
      prisma.notification.updateMany.mockResolvedValue({ count: 3 });

      await service.markAllAsRead('user-1');

      const call = prisma.notification.updateMany.mock.calls[0][0];
      expect(call.where).toEqual({ userId: 'user-1', isRead: false });
      expect(call.data.isRead).toBe(true);
      expect(call.data.readAt).toBeInstanceOf(Date);
    });
  });

  // ---------------------------------------------------------------------------
  // delete
  // ---------------------------------------------------------------------------
  describe('delete', () => {
    it('should call deleteMany with correct where clause (id + userId)', async () => {
      prisma.notification.deleteMany.mockResolvedValue({ count: 1 });

      await service.delete('notif-1', 'user-1');

      expect(prisma.notification.deleteMany).toHaveBeenCalledWith({
        where: { id: 'notif-1', userId: 'user-1' },
      });
    });
  });

  // ---------------------------------------------------------------------------
  // notifyAllAdmins
  // ---------------------------------------------------------------------------
  describe('notifyAllAdmins', () => {
    const notifData = {
      title: 'Nueva orden',
      message: 'Se creó una nueva orden',
      type: 'INFO',
    };

    it('should create notifications for every user in the admin role', async () => {
      const adminRole = {
        id: 'role-admin',
        name: 'admin',
        users: [{ id: 'admin-1' }, { id: 'admin-2' }],
      };
      prisma.role.findUnique.mockResolvedValue(adminRole);
      prisma.notification.createMany.mockResolvedValue({ count: 2 });

      await service.notifyAllAdmins(notifData as any);

      expect(prisma.notification.createMany).toHaveBeenCalledWith({
        data: [
          { userId: 'admin-1', ...notifData },
          { userId: 'admin-2', ...notifData },
        ],
      });
    });

    it('should do nothing when admin role does not exist', async () => {
      prisma.role.findUnique.mockResolvedValue(null);

      await service.notifyAllAdmins(notifData as any);

      expect(prisma.notification.createMany).not.toHaveBeenCalled();
    });

    it('should do nothing when admin role has no users', async () => {
      prisma.role.findUnique.mockResolvedValue({
        id: 'role-admin',
        name: 'admin',
        users: [],
      });

      await service.notifyAllAdmins(notifData as any);

      expect(prisma.notification.createMany).not.toHaveBeenCalled();
    });

    it('should query admin role with users included', async () => {
      prisma.role.findUnique.mockResolvedValue({
        id: 'role-admin',
        name: 'admin',
        users: [{ id: 'admin-1' }],
      });
      prisma.notification.createMany.mockResolvedValue({ count: 1 });

      await service.notifyAllAdmins(notifData as any);

      expect(prisma.role.findUnique).toHaveBeenCalledWith({
        where: { name: 'admin' },
        include: { users: { select: { id: true } } },
      });
    });
  });
});
