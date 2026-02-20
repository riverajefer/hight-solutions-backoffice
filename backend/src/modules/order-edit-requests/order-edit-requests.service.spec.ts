import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { OrderEditRequestsService } from './order-edit-requests.service';
import { PrismaService } from '../../database/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import {
  createMockPrismaService,
  MockPrismaService,
} from '../../database/prisma.service.mock';
import { EditRequestStatus } from '../../generated/prisma';

// ---------------------------------------------------------------------------
// Mock: NotificationsService
// ---------------------------------------------------------------------------
const mockNotificationsService = {
  create: jest.fn(),
  notifyAllAdmins: jest.fn(),
};

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------
const mockOrder = { id: 'order-1', orderNumber: 'OP-2026-001', status: 'CONFIRMED' };
const mockEditableStatus = { orderStatus: 'CONFIRMED', allowEditRequests: true };

const mockNonAdminUser = {
  id: 'user-1',
  email: 'user@test.com',
  firstName: 'Ana',
  role: { name: 'manager' },
};
const mockAdminUser = { id: 'admin-1', email: 'admin@test.com', role: { name: 'admin' } };

const mockPendingRequest = {
  id: 'req-1',
  orderId: 'order-1',
  requestedById: 'user-1',
  status: EditRequestStatus.PENDING,
  observations: 'Necesito editar la orden',
  requestedBy: {
    id: 'user-1',
    email: 'user@test.com',
    firstName: 'Ana',
    lastName: 'García',
  },
  order: { id: 'order-1', orderNumber: 'OP-2026-001' },
};

const mockApprovedRequest = {
  ...mockPendingRequest,
  status: EditRequestStatus.APPROVED,
  expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 min from now
};

const mockExpiredRequest = {
  ...mockApprovedRequest,
  expiresAt: new Date(Date.now() - 1000), // already expired
};

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------
describe('OrderEditRequestsService', () => {
  let service: OrderEditRequestsService;
  let prisma: MockPrismaService;

  beforeEach(async () => {
    prisma = createMockPrismaService();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrderEditRequestsService,
        { provide: PrismaService, useValue: prisma },
        { provide: NotificationsService, useValue: mockNotificationsService },
      ],
    }).compile();

    service = module.get<OrderEditRequestsService>(OrderEditRequestsService);

    // Default happy-path stubs
    prisma.order.findUnique.mockResolvedValue(mockOrder);
    prisma.editableOrderStatus.findUnique.mockResolvedValue(mockEditableStatus);
    prisma.user.findUnique.mockResolvedValue(mockNonAdminUser);
    prisma.orderEditRequest.findFirst.mockResolvedValue(null); // no pending request
    prisma.orderEditRequest.create.mockResolvedValue(mockPendingRequest);
    mockNotificationsService.notifyAllAdmins.mockResolvedValue(undefined);
    mockNotificationsService.create.mockResolvedValue(undefined);
  });

  afterEach(() => jest.clearAllMocks());

  // ---------------------------------------------------------------------------
  // create
  // ---------------------------------------------------------------------------
  describe('create', () => {
    const createDto = { observations: 'Necesito editar la orden' };

    it('should throw NotFoundException when order does not exist', async () => {
      prisma.order.findUnique.mockResolvedValue(null);

      await expect(
        service.create('order-1', 'user-1', createDto),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when order status does not allow edit requests', async () => {
      prisma.editableOrderStatus.findUnique.mockResolvedValue(null);

      await expect(
        service.create('order-1', 'user-1', createDto),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when order status has allowEditRequests=false', async () => {
      prisma.editableOrderStatus.findUnique.mockResolvedValue({
        orderStatus: 'CONFIRMED',
        allowEditRequests: false,
      });

      await expect(
        service.create('order-1', 'user-1', createDto),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when requester is an admin', async () => {
      prisma.user.findUnique.mockResolvedValue(mockAdminUser);

      await expect(
        service.create('order-1', 'admin-1', createDto),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when a PENDING request already exists for this user+order', async () => {
      prisma.orderEditRequest.findFirst.mockResolvedValue(mockPendingRequest);

      await expect(
        service.create('order-1', 'user-1', createDto),
      ).rejects.toThrow(BadRequestException);
    });

    it('should create the request with PENDING status', async () => {
      await service.create('order-1', 'user-1', createDto);

      expect(prisma.orderEditRequest.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            orderId: 'order-1',
            requestedById: 'user-1',
            status: EditRequestStatus.PENDING,
            observations: createDto.observations,
          }),
        }),
      );
    });

    it('should notify all admins after creating the request', async () => {
      await service.create('order-1', 'user-1', createDto);

      expect(mockNotificationsService.notifyAllAdmins).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Nueva solicitud de edición de orden',
        }),
      );
    });

    it('should return the created request', async () => {
      const result = await service.create('order-1', 'user-1', createDto);

      expect(result).toEqual(mockPendingRequest);
    });
  });

  // ---------------------------------------------------------------------------
  // approve
  // ---------------------------------------------------------------------------
  describe('approve', () => {
    const reviewDto = { reviewNotes: 'Aprobado' };

    beforeEach(() => {
      prisma.orderEditRequest.findFirst.mockResolvedValue(mockPendingRequest);
      prisma.user.findUnique.mockResolvedValue(mockAdminUser);
      prisma.orderEditRequest.update.mockResolvedValue({
        ...mockPendingRequest,
        status: EditRequestStatus.APPROVED,
      });
    });

    it('should throw NotFoundException when request does not exist or is not PENDING', async () => {
      prisma.orderEditRequest.findFirst.mockResolvedValue(null);

      await expect(
        service.approve('order-1', 'req-1', 'admin-1', reviewDto),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when reviewer is not an admin', async () => {
      prisma.user.findUnique.mockResolvedValue(mockNonAdminUser);

      await expect(
        service.approve('order-1', 'req-1', 'user-1', reviewDto),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should update the request to APPROVED with expiresAt set 5 minutes in the future', async () => {
      const before = Date.now();
      await service.approve('order-1', 'req-1', 'admin-1', reviewDto);
      const after = Date.now();

      const callData = prisma.orderEditRequest.update.mock.calls[0][0].data;
      expect(callData.status).toBe(EditRequestStatus.APPROVED);

      const expiresMs = callData.expiresAt.getTime();
      expect(expiresMs).toBeGreaterThan(before + 4 * 60 * 1000);
      expect(expiresMs).toBeLessThan(after + 6 * 60 * 1000);
    });

    it('should set reviewedById to the admin id', async () => {
      await service.approve('order-1', 'req-1', 'admin-1', reviewDto);

      const callData = prisma.orderEditRequest.update.mock.calls[0][0].data;
      expect(callData.reviewedById).toBe('admin-1');
    });

    it('should notify the requester after approval', async () => {
      await service.approve('order-1', 'req-1', 'admin-1', reviewDto);

      expect(mockNotificationsService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-1',
          title: 'Solicitud de edición aprobada',
        }),
      );
    });

    it('should return the updated request', async () => {
      const result = await service.approve('order-1', 'req-1', 'admin-1', reviewDto);

      expect(result).toMatchObject({ status: EditRequestStatus.APPROVED });
    });
  });

  // ---------------------------------------------------------------------------
  // reject
  // ---------------------------------------------------------------------------
  describe('reject', () => {
    const reviewDto = { reviewNotes: 'No aplica en este momento' };

    beforeEach(() => {
      prisma.orderEditRequest.findFirst.mockResolvedValue(mockPendingRequest);
      prisma.user.findUnique.mockResolvedValue(mockAdminUser);
      prisma.orderEditRequest.update.mockResolvedValue({
        ...mockPendingRequest,
        status: EditRequestStatus.REJECTED,
      });
    });

    it('should throw NotFoundException when request does not exist or is not PENDING', async () => {
      prisma.orderEditRequest.findFirst.mockResolvedValue(null);

      await expect(
        service.reject('order-1', 'req-1', 'admin-1', reviewDto),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when reviewer is not an admin', async () => {
      prisma.user.findUnique.mockResolvedValue(mockNonAdminUser);

      await expect(
        service.reject('order-1', 'req-1', 'user-1', reviewDto),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should update the request to REJECTED', async () => {
      await service.reject('order-1', 'req-1', 'admin-1', reviewDto);

      expect(prisma.orderEditRequest.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: EditRequestStatus.REJECTED }),
        }),
      );
    });

    it('should include reviewNotes in the rejection notification message', async () => {
      await service.reject('order-1', 'req-1', 'admin-1', reviewDto);

      const notifArg = mockNotificationsService.create.mock.calls[0][0];
      expect(notifArg.message).toContain('Motivo: No aplica en este momento');
    });

    it('should not include Motivo in notification when reviewNotes is empty', async () => {
      await service.reject('order-1', 'req-1', 'admin-1', { reviewNotes: '' });

      const notifArg = mockNotificationsService.create.mock.calls[0][0];
      expect(notifArg.message).not.toContain('Motivo:');
    });

    it('should return the rejected request', async () => {
      const result = await service.reject('order-1', 'req-1', 'admin-1', reviewDto);

      expect(result).toMatchObject({ status: EditRequestStatus.REJECTED });
    });
  });

  // ---------------------------------------------------------------------------
  // hasActivePermission
  // ---------------------------------------------------------------------------
  describe('hasActivePermission', () => {
    it('should return true when an unexpired APPROVED request exists', async () => {
      prisma.orderEditRequest.findFirst.mockResolvedValue(mockApprovedRequest);

      const result = await service.hasActivePermission('order-1', 'user-1');

      expect(result).toBe(true);
    });

    it('should return false when no active APPROVED request exists', async () => {
      prisma.orderEditRequest.findFirst.mockResolvedValue(null);

      const result = await service.hasActivePermission('order-1', 'user-1');

      expect(result).toBe(false);
    });

    it('should query with expiresAt > now filter', async () => {
      prisma.orderEditRequest.findFirst.mockResolvedValue(null);

      await service.hasActivePermission('order-1', 'user-1');

      const whereArg = prisma.orderEditRequest.findFirst.mock.calls[0][0].where;
      expect(whereArg.status).toBe(EditRequestStatus.APPROVED);
      expect(whereArg.expiresAt).toBeDefined();
      expect(whereArg.expiresAt.gt).toBeInstanceOf(Date);
    });
  });

  // ---------------------------------------------------------------------------
  // getActivePermission
  // ---------------------------------------------------------------------------
  describe('getActivePermission', () => {
    it('should return the active permission when found', async () => {
      prisma.orderEditRequest.findFirst.mockResolvedValue(mockApprovedRequest);

      const result = await service.getActivePermission('order-1', 'user-1');

      expect(result).toEqual(mockApprovedRequest);
    });

    it('should return null when no active permission exists', async () => {
      prisma.orderEditRequest.findFirst.mockResolvedValue(null);

      const result = await service.getActivePermission('order-1', 'user-1');

      expect(result).toBeNull();
    });
  });

  // ---------------------------------------------------------------------------
  // findByOrder
  // ---------------------------------------------------------------------------
  describe('findByOrder', () => {
    it('should return all requests for the order ordered by createdAt desc', async () => {
      const requests = [mockPendingRequest];
      prisma.orderEditRequest.findMany.mockResolvedValue(requests);

      const result = await service.findByOrder('order-1');

      expect(prisma.orderEditRequest.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { orderId: 'order-1' },
          orderBy: { createdAt: 'desc' },
        }),
      );
      expect(result).toEqual(requests);
    });
  });

  // ---------------------------------------------------------------------------
  // findOne
  // ---------------------------------------------------------------------------
  describe('findOne', () => {
    it('should return the request when found', async () => {
      prisma.orderEditRequest.findFirst.mockResolvedValue(mockPendingRequest);

      const result = await service.findOne('order-1', 'req-1');

      expect(result).toEqual(mockPendingRequest);
    });

    it('should throw NotFoundException when request does not exist', async () => {
      prisma.orderEditRequest.findFirst.mockResolvedValue(null);

      await expect(service.findOne('order-1', 'req-nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
