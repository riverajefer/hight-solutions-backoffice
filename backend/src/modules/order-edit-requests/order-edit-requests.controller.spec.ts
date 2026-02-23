import { Test, TestingModule } from '@nestjs/testing';
import { OrderEditRequestsController } from './order-edit-requests.controller';
import { OrderEditRequestsService } from './order-edit-requests.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';

const mockOrderEditRequestsService = {
  create: jest.fn(),
  findByOrder: jest.fn(),
  getActivePermission: jest.fn(),
  findOne: jest.fn(),
  approve: jest.fn(),
  reject: jest.fn(),
};

const mockEditRequest = {
  id: 'req-1',
  orderId: 'order-1',
  requestedById: 'user-1',
  status: 'PENDING',
  reason: 'Cambio de medidas',
  createdAt: new Date('2026-01-01'),
};

describe('OrderEditRequestsController', () => {
  let controller: OrderEditRequestsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OrderEditRequestsController],
      providers: [
        { provide: OrderEditRequestsService, useValue: mockOrderEditRequestsService },
      ],
    })
      .overrideGuard(JwtAuthGuard).useValue({ canActivate: () => true })
      .overrideGuard(PermissionsGuard).useValue({ canActivate: () => true })
      .compile();

    controller = module.get<OrderEditRequestsController>(OrderEditRequestsController);
  });

  afterEach(() => jest.clearAllMocks());

  describe('create', () => {
    it('should delegate to service with orderId, userId and dto', async () => {
      const dto = { reason: 'Cambio de medidas' } as any;
      mockOrderEditRequestsService.create.mockResolvedValue(mockEditRequest);

      const result = await controller.create('order-1', 'user-1', dto);

      expect(mockOrderEditRequestsService.create).toHaveBeenCalledWith(
        'order-1',
        'user-1',
        dto,
      );
      expect(result).toMatchObject({ orderId: 'order-1' });
    });
  });

  describe('findByOrder', () => {
    it('should delegate to service with orderId', async () => {
      mockOrderEditRequestsService.findByOrder.mockResolvedValue([mockEditRequest]);

      const result = await controller.findByOrder('order-1');

      expect(mockOrderEditRequestsService.findByOrder).toHaveBeenCalledWith('order-1');
      expect(result).toHaveLength(1);
    });

    it('should return empty array when no requests exist', async () => {
      mockOrderEditRequestsService.findByOrder.mockResolvedValue([]);

      const result = await controller.findByOrder('order-999');

      expect(result).toHaveLength(0);
    });
  });

  describe('getActivePermission', () => {
    it('should delegate to service with orderId and userId', async () => {
      const activePermission = { hasPermission: true, expiresAt: new Date() };
      mockOrderEditRequestsService.getActivePermission.mockResolvedValue(activePermission);

      const result = await controller.getActivePermission('order-1', 'user-1');

      expect(mockOrderEditRequestsService.getActivePermission).toHaveBeenCalledWith(
        'order-1',
        'user-1',
      );
      expect(result).toMatchObject({ hasPermission: true });
    });

    it('should return null when user has no active permission', async () => {
      mockOrderEditRequestsService.getActivePermission.mockResolvedValue(null);

      const result = await controller.getActivePermission('order-1', 'user-1');

      expect(result).toBeNull();
    });
  });

  describe('findOne', () => {
    it('should delegate to service with orderId and requestId', async () => {
      mockOrderEditRequestsService.findOne.mockResolvedValue(mockEditRequest);

      const result = await controller.findOne('order-1', 'req-1');

      expect(mockOrderEditRequestsService.findOne).toHaveBeenCalledWith('order-1', 'req-1');
      expect(result).toMatchObject({ id: 'req-1' });
    });
  });

  describe('approve', () => {
    it('should delegate to service with orderId, requestId, adminId and dto', async () => {
      const dto = { adminNotes: 'Aprobado' } as any;
      const approvedRequest = { ...mockEditRequest, status: 'APPROVED', reviewedById: 'admin-1' };
      mockOrderEditRequestsService.approve.mockResolvedValue(approvedRequest);

      const result = await controller.approve('order-1', 'req-1', 'admin-1', dto);

      expect(mockOrderEditRequestsService.approve).toHaveBeenCalledWith(
        'order-1',
        'req-1',
        'admin-1',
        dto,
      );
      expect(result).toMatchObject({ status: 'APPROVED' });
    });
  });

  describe('reject', () => {
    it('should delegate to service with orderId, requestId, adminId and dto', async () => {
      const dto = { adminNotes: 'No aplica' } as any;
      const rejectedRequest = { ...mockEditRequest, status: 'REJECTED', reviewedById: 'admin-1' };
      mockOrderEditRequestsService.reject.mockResolvedValue(rejectedRequest);

      const result = await controller.reject('order-1', 'req-1', 'admin-1', dto);

      expect(mockOrderEditRequestsService.reject).toHaveBeenCalledWith(
        'order-1',
        'req-1',
        'admin-1',
        dto,
      );
      expect(result).toMatchObject({ status: 'REJECTED' });
    });
  });
});
