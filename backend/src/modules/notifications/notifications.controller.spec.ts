import { Test, TestingModule } from '@nestjs/testing';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

const mockNotificationsService = {
  findByUser: jest.fn(),
  countUnread: jest.fn(),
  markAsRead: jest.fn(),
  markAllAsRead: jest.fn(),
  delete: jest.fn(),
};

const mockNotification = {
  id: 'notif-1',
  userId: 'user-1',
  title: 'Nueva orden asignada',
  message: 'Se te ha asignado la orden OP-2026-001',
  isRead: false,
  createdAt: new Date('2026-01-01'),
};

describe('NotificationsController', () => {
  let controller: NotificationsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [NotificationsController],
      providers: [{ provide: NotificationsService, useValue: mockNotificationsService }],
    })
      .overrideGuard(JwtAuthGuard).useValue({ canActivate: () => true })
      .compile();

    controller = module.get<NotificationsController>(NotificationsController);
  });

  afterEach(() => jest.clearAllMocks());

  describe('findAll', () => {
    it('should delegate to notificationsService.findByUser with userId and filters', async () => {
      const filters = { page: 1, limit: 20 } as any;
      mockNotificationsService.findByUser.mockResolvedValue({
        data: [mockNotification],
        total: 1,
        page: 1,
        limit: 20,
      });

      const result = await controller.findAll('user-1', filters);

      expect(mockNotificationsService.findByUser).toHaveBeenCalledWith('user-1', filters);
      expect(result.data).toHaveLength(1);
    });
  });

  describe('countUnread', () => {
    it('should return the unread count wrapped in an object', async () => {
      mockNotificationsService.countUnread.mockResolvedValue(5);

      const result = await controller.countUnread('user-1');

      expect(mockNotificationsService.countUnread).toHaveBeenCalledWith('user-1');
      expect(result).toEqual({ count: 5 });
    });

    it('should return count 0 when no unread notifications', async () => {
      mockNotificationsService.countUnread.mockResolvedValue(0);

      const result = await controller.countUnread('user-1');

      expect(result).toEqual({ count: 0 });
    });
  });

  describe('markAsRead', () => {
    it('should delegate to notificationsService.markAsRead and return success message', async () => {
      mockNotificationsService.markAsRead.mockResolvedValue({ count: 1 });

      const result = await controller.markAsRead('notif-1', 'user-1');

      expect(mockNotificationsService.markAsRead).toHaveBeenCalledWith('notif-1', 'user-1');
      expect(result).toEqual({ message: 'Notification marked as read' });
    });
  });

  describe('markAllAsRead', () => {
    it('should delegate to notificationsService.markAllAsRead and return success message', async () => {
      mockNotificationsService.markAllAsRead.mockResolvedValue({ count: 3 });

      const result = await controller.markAllAsRead('user-1');

      expect(mockNotificationsService.markAllAsRead).toHaveBeenCalledWith('user-1');
      expect(result).toEqual({ message: 'All notifications marked as read' });
    });
  });

  describe('delete', () => {
    it('should delegate to notificationsService.delete and return success message', async () => {
      mockNotificationsService.delete.mockResolvedValue({ count: 1 });

      const result = await controller.delete('notif-1', 'user-1');

      expect(mockNotificationsService.delete).toHaveBeenCalledWith('notif-1', 'user-1');
      expect(result).toEqual({ message: 'Notification deleted' });
    });
  });
});
