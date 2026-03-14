import { Test, TestingModule } from '@nestjs/testing';
import { OrderStatusChangeRequestsController } from './order-status-change-requests.controller';
import { OrderStatusChangeRequestsService } from './order-status-change-requests.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';

const mockService = {
  create: jest.fn(),
  findPendingRequests: jest.fn(),
  approve: jest.fn(),
  reject: jest.fn(),
  findByUser: jest.fn(),
  findOne: jest.fn(),
};

const mockRequest = {
  id: 'scr-1',
  orderId: 'order-1',
  requestedById: 'user-1',
  requestedStatus: 'COMPLETED',
  status: 'PENDING',
  reason: 'Orden terminada en producción',
  createdAt: new Date('2026-01-01'),
};

describe('OrderStatusChangeRequestsController', () => {
  let controller: OrderStatusChangeRequestsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OrderStatusChangeRequestsController],
      providers: [
        { provide: OrderStatusChangeRequestsService, useValue: mockService },
      ],
    })
      .overrideGuard(JwtAuthGuard).useValue({ canActivate: () => true })
      .overrideGuard(PermissionsGuard).useValue({ canActivate: () => true })
      .compile();

    controller = module.get<OrderStatusChangeRequestsController>(
      OrderStatusChangeRequestsController,
    );
  });

  afterEach(() => jest.clearAllMocks());

  describe('create', () => {
    it('should delegate to service with userId and dto', async () => {
      const dto = { orderId: 'order-1', requestedStatus: 'COMPLETED', reason: 'Listo' } as any;
      mockService.create.mockResolvedValue(mockRequest);

      const result = await controller.create('user-1', dto);

      expect(mockService.create).toHaveBeenCalledWith('user-1', dto);
      expect(result).toMatchObject({ id: 'scr-1' });
    });
  });

  describe('findPending', () => {
    it('should delegate to service with no orderId when not provided', async () => {
      mockService.findPendingRequests.mockResolvedValue([mockRequest]);

      const result = await controller.findPending(undefined);

      expect(mockService.findPendingRequests).toHaveBeenCalledWith(undefined);
      expect(result).toHaveLength(1);
    });

    it('should delegate to service with orderId filter when provided', async () => {
      mockService.findPendingRequests.mockResolvedValue([mockRequest]);

      const result = await controller.findPending('order-1');

      expect(mockService.findPendingRequests).toHaveBeenCalledWith('order-1');
      expect(result).toHaveLength(1);
    });
  });

  describe('approve', () => {
    it('should delegate to service with requestId, adminId and dto', async () => {
      const dto = { adminNotes: 'Confirmado' } as any;
      const approvedRequest = { ...mockRequest, status: 'APPROVED' };
      mockService.approve.mockResolvedValue(approvedRequest);

      const result = await controller.approve('scr-1', 'admin-1', dto);

      expect(mockService.approve).toHaveBeenCalledWith('scr-1', 'admin-1', dto);
      expect(result).toMatchObject({ status: 'APPROVED' });
    });
  });

  describe('reject', () => {
    it('should delegate to service with requestId, adminId and dto', async () => {
      const dto = { adminNotes: 'No procede' } as any;
      const rejectedRequest = { ...mockRequest, status: 'REJECTED' };
      mockService.reject.mockResolvedValue(rejectedRequest);

      const result = await controller.reject('scr-1', 'admin-1', dto);

      expect(mockService.reject).toHaveBeenCalledWith('scr-1', 'admin-1', dto);
      expect(result).toMatchObject({ status: 'REJECTED' });
    });
  });

  describe('findMyRequests', () => {
    it('should delegate to service with userId', async () => {
      mockService.findByUser.mockResolvedValue([mockRequest]);

      const result = await controller.findMyRequests('user-1');

      expect(mockService.findByUser).toHaveBeenCalledWith('user-1');
      expect(result).toHaveLength(1);
    });

    it('should return empty array when user has no requests', async () => {
      mockService.findByUser.mockResolvedValue([]);

      const result = await controller.findMyRequests('user-99');

      expect(result).toHaveLength(0);
    });
  });

  describe('findOne', () => {
    it('should delegate to service with requestId', async () => {
      mockService.findOne.mockResolvedValue(mockRequest);

      const result = await controller.findOne('scr-1');

      expect(mockService.findOne).toHaveBeenCalledWith('scr-1');
      expect(result).toMatchObject({ id: 'scr-1' });
    });
  });
});
