import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { PermissionsGuard } from './permissions.guard';
import { PrismaService } from '../../database/prisma.service';
import { PERMISSIONS_KEY } from '../decorators/require-permissions.decorator';
import { createMockPrismaService, MockPrismaService } from '../../database/prisma.service.mock';

const createMockExecutionContext = (user: any): ExecutionContext =>
  ({
    switchToHttp: () => ({
      getRequest: () => ({ user }),
    }),
    getHandler: () => ({}),
    getClass: () => ({}),
  }) as unknown as ExecutionContext;

describe('PermissionsGuard', () => {
  let guard: PermissionsGuard;
  let reflector: jest.Mocked<Reflector>;
  let prisma: MockPrismaService;

  const mockUser = { id: 'user-1', email: 'test@example.com', roleId: 'role-1' };

  const mockRoleWithPermissions = (permissionNames: string[]) => ({
    id: 'role-1',
    name: 'admin',
    permissions: permissionNames.map((name) => ({
      permission: { id: `perm-${name}`, name },
    })),
  });

  beforeEach(async () => {
    prisma = createMockPrismaService();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PermissionsGuard,
        { provide: PrismaService, useValue: prisma },
        {
          provide: Reflector,
          useValue: { getAllAndOverride: jest.fn() },
        },
      ],
    }).compile();

    guard = module.get<PermissionsGuard>(PermissionsGuard);
    reflector = module.get(Reflector);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('canActivate - no permissions required', () => {
    it('should return true when no @RequirePermissions decorator is present', async () => {
      reflector.getAllAndOverride.mockReturnValue(undefined);
      const context = createMockExecutionContext(mockUser);

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(prisma.role.findUnique).not.toHaveBeenCalled();
    });

    it('should return true when @RequirePermissions is an empty array', async () => {
      reflector.getAllAndOverride.mockReturnValue([]);
      const context = createMockExecutionContext(mockUser);

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(prisma.role.findUnique).not.toHaveBeenCalled();
    });
  });

  describe('canActivate - user has required permissions', () => {
    it('should return true when user has a single required permission', async () => {
      reflector.getAllAndOverride.mockReturnValue(['read_users']);
      (prisma.role.findUnique as jest.Mock).mockResolvedValue(
        mockRoleWithPermissions(['read_users']),
      );
      const context = createMockExecutionContext(mockUser);

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should return true when user has all of multiple required permissions', async () => {
      reflector.getAllAndOverride.mockReturnValue(['read_users', 'update_users']);
      (prisma.role.findUnique as jest.Mock).mockResolvedValue(
        mockRoleWithPermissions(['read_users', 'update_users', 'create_users']),
      );
      const context = createMockExecutionContext(mockUser);

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should query prisma.role.findUnique with correct roleId and includes', async () => {
      reflector.getAllAndOverride.mockReturnValue(['read_users']);
      (prisma.role.findUnique as jest.Mock).mockResolvedValue(
        mockRoleWithPermissions(['read_users']),
      );
      const context = createMockExecutionContext(mockUser);

      await guard.canActivate(context);

      expect(prisma.role.findUnique).toHaveBeenCalledWith({
        where: { id: mockUser.roleId },
        include: {
          permissions: {
            include: {
              permission: true,
            },
          },
        },
      });
    });
  });

  describe('canActivate - user missing permissions', () => {
    it('should throw ForbiddenException listing missing permissions', async () => {
      reflector.getAllAndOverride.mockReturnValue(['delete_users']);
      (prisma.role.findUnique as jest.Mock).mockResolvedValue(
        mockRoleWithPermissions(['read_users']),
      );
      const context = createMockExecutionContext(mockUser);

      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
      await expect(guard.canActivate(context)).rejects.toThrow('delete_users');
    });

    it('should throw ForbiddenException when user is missing one of multiple required permissions', async () => {
      reflector.getAllAndOverride.mockReturnValue(['read_users', 'delete_users']);
      (prisma.role.findUnique as jest.Mock).mockResolvedValue(
        mockRoleWithPermissions(['read_users']),
      );
      const context = createMockExecutionContext(mockUser);

      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('canActivate - authentication errors', () => {
    it('should throw ForbiddenException when user is null', async () => {
      reflector.getAllAndOverride.mockReturnValue(['read_users']);
      const context = createMockExecutionContext(null);

      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
      await expect(guard.canActivate(context)).rejects.toThrow(
        'User not authenticated or role not found',
      );
    });

    it('should throw ForbiddenException when user has no roleId', async () => {
      reflector.getAllAndOverride.mockReturnValue(['read_users']);
      const context = createMockExecutionContext({ id: 'user-1', email: 'test@example.com' });

      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException when roleId does not exist in DB', async () => {
      reflector.getAllAndOverride.mockReturnValue(['read_users']);
      (prisma.role.findUnique as jest.Mock).mockResolvedValue(null);
      const context = createMockExecutionContext(mockUser);

      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('reflector usage', () => {
    it('should call reflector.getAllAndOverride with PERMISSIONS_KEY', async () => {
      reflector.getAllAndOverride.mockReturnValue(undefined);
      const context = createMockExecutionContext(mockUser);

      await guard.canActivate(context);

      expect(reflector.getAllAndOverride).toHaveBeenCalledWith(PERMISSIONS_KEY, [
        expect.anything(),
        expect.anything(),
      ]);
    });
  });
});
