import { Test, TestingModule } from '@nestjs/testing';
import { RolesRepository } from './roles.repository';
import { PrismaService } from '../../database/prisma.service';
import {
  createMockPrismaService,
  MockPrismaService,
} from '../../database/prisma.service.mock';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------
const mockRole = {
  id: 'role-1',
  name: 'manager',
  description: 'Manager role',
  permissions: [
    {
      permission: { id: 'perm-1', name: 'read_users', description: 'Read users' },
    },
  ],
  _count: { users: 5 },
};

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------
describe('RolesRepository', () => {
  let repository: RolesRepository;
  let prisma: MockPrismaService;

  beforeEach(async () => {
    prisma = createMockPrismaService();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RolesRepository,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    repository = module.get<RolesRepository>(RolesRepository);
  });

  afterEach(() => jest.clearAllMocks());

  // ---------------------------------------------------------------------------
  // findAll
  // ---------------------------------------------------------------------------
  describe('findAll', () => {
    it('should return all roles ordered by name asc', async () => {
      prisma.role.findMany.mockResolvedValue([mockRole]);

      const result = await repository.findAll();

      expect(prisma.role.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ orderBy: { name: 'asc' } }),
      );
      expect(result).toEqual([mockRole]);
    });

    it('should include permissions and _count of users', async () => {
      prisma.role.findMany.mockResolvedValue([mockRole]);

      await repository.findAll();

      const callArg = prisma.role.findMany.mock.calls[0][0];
      expect(callArg.include.permissions).toBeDefined();
      expect(callArg.include._count.select.users).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // findById
  // ---------------------------------------------------------------------------
  describe('findById', () => {
    it('should call role.findUnique with the given id', async () => {
      prisma.role.findUnique.mockResolvedValue(mockRole);

      const result = await repository.findById('role-1');

      expect(prisma.role.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'role-1' } }),
      );
      expect(result).toEqual(mockRole);
    });

    it('should include users list in findById', async () => {
      prisma.role.findUnique.mockResolvedValue({ ...mockRole, users: [] });

      await repository.findById('role-1');

      const callArg = prisma.role.findUnique.mock.calls[0][0];
      expect(callArg.include.users).toBeDefined();
    });

    it('should return null when role does not exist', async () => {
      prisma.role.findUnique.mockResolvedValue(null);

      const result = await repository.findById('nonexistent');

      expect(result).toBeNull();
    });
  });

  // ---------------------------------------------------------------------------
  // findByName
  // ---------------------------------------------------------------------------
  describe('findByName', () => {
    it('should call role.findUnique with the given name', async () => {
      prisma.role.findUnique.mockResolvedValue(mockRole);

      await repository.findByName('manager');

      expect(prisma.role.findUnique).toHaveBeenCalledWith({ where: { name: 'manager' } });
    });
  });

  // ---------------------------------------------------------------------------
  // findByNameExcludingId
  // ---------------------------------------------------------------------------
  describe('findByNameExcludingId', () => {
    it('should call role.findFirst with NOT id clause', async () => {
      prisma.role.findFirst.mockResolvedValue(null);

      await repository.findByNameExcludingId('admin', 'role-1');

      expect(prisma.role.findFirst).toHaveBeenCalledWith({
        where: { name: 'admin', NOT: { id: 'role-1' } },
      });
    });
  });

  // ---------------------------------------------------------------------------
  // create
  // ---------------------------------------------------------------------------
  describe('create', () => {
    it('should call role.create with the provided data and return the role', async () => {
      prisma.role.create.mockResolvedValue(mockRole);

      const result = await repository.create({ name: 'manager' } as any);

      expect(prisma.role.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: { name: 'manager' } }),
      );
      expect(result).toEqual(mockRole);
    });
  });

  // ---------------------------------------------------------------------------
  // createWithPermissions
  // ---------------------------------------------------------------------------
  describe('createWithPermissions', () => {
    it('should create role with nested permissions using connect', async () => {
      prisma.role.create.mockResolvedValue(mockRole);

      await repository.createWithPermissions('editor', 'Editor role', ['perm-1', 'perm-2']);

      expect(prisma.role.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            name: 'editor',
            description: 'Editor role',
            permissions: {
              create: [
                { permission: { connect: { id: 'perm-1' } } },
                { permission: { connect: { id: 'perm-2' } } },
              ],
            },
          }),
        }),
      );
    });

    it('should create role with no permissions when permissionIds is empty', async () => {
      prisma.role.create.mockResolvedValue({ ...mockRole, permissions: [] });

      await repository.createWithPermissions('viewer', undefined, []);

      const callArg = prisma.role.create.mock.calls[0][0];
      expect(callArg.data.permissions.create).toHaveLength(0);
    });
  });

  // ---------------------------------------------------------------------------
  // update
  // ---------------------------------------------------------------------------
  describe('update', () => {
    it('should call role.update with the given id and data', async () => {
      prisma.role.update.mockResolvedValue(mockRole);

      await repository.update('role-1', { description: 'Updated' } as any);

      expect(prisma.role.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'role-1' },
          data: { description: 'Updated' },
        }),
      );
    });
  });

  // ---------------------------------------------------------------------------
  // replacePermissions
  // ---------------------------------------------------------------------------
  describe('replacePermissions', () => {
    it('should call $transaction with deleteMany and createMany operations', async () => {
      // replacePermissions uses prisma.$transaction([op1, op2]) — array form
      prisma.$transaction.mockResolvedValue([{ count: 1 }, { count: 2 }]);

      await repository.replacePermissions('role-1', ['perm-1', 'perm-2']);

      expect(prisma.$transaction).toHaveBeenCalled();
    });

    it('should delete existing permissions before creating new ones', async () => {
      prisma.$transaction.mockResolvedValue([undefined, undefined]);
      prisma.rolePermission.deleteMany.mockResolvedValue({ count: 3 });
      prisma.rolePermission.createMany.mockResolvedValue({ count: 2 });

      await repository.replacePermissions('role-1', ['perm-new']);

      // The deleteMany should have been called with correct roleId
      expect(prisma.rolePermission.deleteMany).toHaveBeenCalledWith({
        where: { roleId: 'role-1' },
      });
    });

    it('should create new permissions with correct roleId and permissionId mapping', async () => {
      prisma.$transaction.mockResolvedValue([undefined, undefined]);
      prisma.rolePermission.createMany.mockResolvedValue({ count: 2 });

      await repository.replacePermissions('role-1', ['perm-1', 'perm-2']);

      expect(prisma.rolePermission.createMany).toHaveBeenCalledWith({
        data: [
          { roleId: 'role-1', permissionId: 'perm-1' },
          { roleId: 'role-1', permissionId: 'perm-2' },
        ],
      });
    });
  });

  // ---------------------------------------------------------------------------
  // addPermissions
  // ---------------------------------------------------------------------------
  describe('addPermissions', () => {
    it('should call rolePermission.createMany with correct data', async () => {
      prisma.rolePermission.createMany.mockResolvedValue({ count: 2 });

      await repository.addPermissions('role-1', ['perm-3', 'perm-4']);

      expect(prisma.rolePermission.createMany).toHaveBeenCalledWith({
        data: [
          { roleId: 'role-1', permissionId: 'perm-3' },
          { roleId: 'role-1', permissionId: 'perm-4' },
        ],
      });
    });
  });

  // ---------------------------------------------------------------------------
  // removePermissions
  // ---------------------------------------------------------------------------
  describe('removePermissions', () => {
    it('should call rolePermission.deleteMany with roleId and permissionId filter', async () => {
      prisma.rolePermission.deleteMany.mockResolvedValue({ count: 1 });

      await repository.removePermissions('role-1', ['perm-1']);

      expect(prisma.rolePermission.deleteMany).toHaveBeenCalledWith({
        where: {
          roleId: 'role-1',
          permissionId: { in: ['perm-1'] },
        },
      });
    });
  });

  // ---------------------------------------------------------------------------
  // delete
  // ---------------------------------------------------------------------------
  describe('delete', () => {
    it('should call role.delete with the given id', async () => {
      prisma.role.delete.mockResolvedValue(mockRole);

      await repository.delete('role-1');

      expect(prisma.role.delete).toHaveBeenCalledWith({ where: { id: 'role-1' } });
    });
  });
});
