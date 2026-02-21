import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, ForbiddenException, NotFoundException } from '@nestjs/common';
import { CanEditOrderGuard } from './can-edit-order.guard';
import { OrderEditRequestsService } from '../../modules/order-edit-requests/order-edit-requests.service';
import { PrismaService } from '../../database/prisma.service';
import {
  createMockPrismaService,
  MockPrismaService,
} from '../../database/prisma.service.mock';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const makeContext = (params: Record<string, string>, user: any): ExecutionContext =>
  ({
    switchToHttp: () => ({
      getRequest: () => ({ params, user }),
    }),
  }) as ExecutionContext;

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------
const mockOrderEditRequestsService = {
  hasActivePermission: jest.fn(),
};

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------
const mockUser = { id: 'user-1', email: 'user@test.com', roleId: 'role-manager' };
const mockAdminUser = { id: 'admin-1', email: 'admin@test.com', roleId: 'role-admin' };

const mockDraftOrder = { id: 'order-1', status: 'DRAFT' };
const mockConfirmedOrder = { id: 'order-1', status: 'CONFIRMED' };

const mockManagerRole = { name: 'manager' };
const mockAdminRole = { name: 'admin' };

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------
describe('CanEditOrderGuard', () => {
  let guard: CanEditOrderGuard;
  let prisma: MockPrismaService;

  beforeEach(async () => {
    prisma = createMockPrismaService();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CanEditOrderGuard,
        { provide: PrismaService, useValue: prisma },
        { provide: OrderEditRequestsService, useValue: mockOrderEditRequestsService },
      ],
    }).compile();

    guard = module.get<CanEditOrderGuard>(CanEditOrderGuard);

    // Default stubs
    prisma.order.findUnique.mockResolvedValue(mockConfirmedOrder);
    prisma.role.findUnique.mockResolvedValue(mockManagerRole);
    mockOrderEditRequestsService.hasActivePermission.mockResolvedValue(false);
  });

  afterEach(() => jest.clearAllMocks());

  // ---------------------------------------------------------------------------
  // orderId missing
  // ---------------------------------------------------------------------------
  describe('when orderId is missing from params', () => {
    it('should throw ForbiddenException when orderId is not in params', async () => {
      const ctx = makeContext({}, mockUser);

      await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
    });
  });

  // ---------------------------------------------------------------------------
  // order not found
  // ---------------------------------------------------------------------------
  describe('when the order does not exist', () => {
    it('should throw NotFoundException', async () => {
      prisma.order.findUnique.mockResolvedValue(null);
      const ctx = makeContext({ id: 'order-1' }, mockUser);

      await expect(guard.canActivate(ctx)).rejects.toThrow(NotFoundException);
    });

    it('should query prisma.order.findUnique with the orderId from params', async () => {
      prisma.order.findUnique.mockResolvedValue(null);
      const ctx = makeContext({ id: 'order-42' }, mockUser);

      await expect(guard.canActivate(ctx)).rejects.toThrow();
      expect(prisma.order.findUnique).toHaveBeenCalledWith({ where: { id: 'order-42' } });
    });
  });

  // ---------------------------------------------------------------------------
  // DRAFT orders
  // ---------------------------------------------------------------------------
  describe('when the order is in DRAFT status', () => {
    it('should return true without checking role or permissions', async () => {
      prisma.order.findUnique.mockResolvedValue(mockDraftOrder);
      const ctx = makeContext({ id: 'order-1' }, mockUser);

      const result = await guard.canActivate(ctx);

      expect(result).toBe(true);
      expect(prisma.role.findUnique).not.toHaveBeenCalled();
      expect(mockOrderEditRequestsService.hasActivePermission).not.toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // admin user
  // ---------------------------------------------------------------------------
  describe('when the user is an admin', () => {
    it('should return true without checking edit permissions', async () => {
      prisma.role.findUnique.mockResolvedValue(mockAdminRole);
      const ctx = makeContext({ id: 'order-1' }, mockAdminUser);

      const result = await guard.canActivate(ctx);

      expect(result).toBe(true);
      expect(mockOrderEditRequestsService.hasActivePermission).not.toHaveBeenCalled();
    });

    it('should look up the role using user.roleId', async () => {
      prisma.role.findUnique.mockResolvedValue(mockAdminRole);
      const ctx = makeContext({ id: 'order-1' }, mockAdminUser);

      await guard.canActivate(ctx);

      expect(prisma.role.findUnique).toHaveBeenCalledWith({
        where: { id: 'role-admin' },
        select: { name: true },
      });
    });
  });

  // ---------------------------------------------------------------------------
  // non-admin with active permission
  // ---------------------------------------------------------------------------
  describe('when the user is not an admin and has an active edit permission', () => {
    it('should return true', async () => {
      mockOrderEditRequestsService.hasActivePermission.mockResolvedValue(true);
      const ctx = makeContext({ id: 'order-1' }, mockUser);

      const result = await guard.canActivate(ctx);

      expect(result).toBe(true);
    });

    it('should call hasActivePermission with orderId and userId', async () => {
      mockOrderEditRequestsService.hasActivePermission.mockResolvedValue(true);
      const ctx = makeContext({ id: 'order-1' }, mockUser);

      await guard.canActivate(ctx);

      expect(mockOrderEditRequestsService.hasActivePermission).toHaveBeenCalledWith(
        'order-1',
        'user-1',
      );
    });
  });

  // ---------------------------------------------------------------------------
  // non-admin without permission
  // ---------------------------------------------------------------------------
  describe('when the user is not an admin and has no active edit permission', () => {
    it('should throw ForbiddenException', async () => {
      mockOrderEditRequestsService.hasActivePermission.mockResolvedValue(false);
      const ctx = makeContext({ id: 'order-1' }, mockUser);

      await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
    });
  });
});
