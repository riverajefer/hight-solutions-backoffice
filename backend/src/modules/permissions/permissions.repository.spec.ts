import { Test, TestingModule } from '@nestjs/testing';
import { PermissionsRepository } from './permissions.repository';
import { PrismaService } from '../../database/prisma.service';
import {
  createMockPrismaService,
  MockPrismaService,
} from '../../database/prisma.service.mock';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------
const mockPermission = {
  id: 'perm-1',
  name: 'read_users',
  description: 'Read users',
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
  _count: { roles: 2 },
};

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------
describe('PermissionsRepository', () => {
  let repository: PermissionsRepository;
  let prisma: MockPrismaService;

  beforeEach(async () => {
    prisma = createMockPrismaService();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PermissionsRepository,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    repository = module.get<PermissionsRepository>(PermissionsRepository);
  });

  afterEach(() => jest.clearAllMocks());

  // ---------------------------------------------------------------------------
  // findAll
  // ---------------------------------------------------------------------------
  describe('findAll', () => {
    it('should return permissions ordered by name asc', async () => {
      prisma.permission.findMany.mockResolvedValue([mockPermission]);

      const result = await repository.findAll();

      expect(prisma.permission.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ orderBy: { name: 'asc' } }),
      );
      expect(result).toEqual([mockPermission]);
    });

    it('should include _count of roles in select', async () => {
      prisma.permission.findMany.mockResolvedValue([mockPermission]);

      await repository.findAll();

      const callArg = prisma.permission.findMany.mock.calls[0][0];
      expect(callArg.select._count.select.roles).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // findById
  // ---------------------------------------------------------------------------
  describe('findById', () => {
    it('should call permission.findUnique with the given id', async () => {
      prisma.permission.findUnique.mockResolvedValue(mockPermission);

      const result = await repository.findById('perm-1');

      expect(prisma.permission.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'perm-1' } }),
      );
      expect(result).toEqual(mockPermission);
    });

    it('should include roles in the response', async () => {
      prisma.permission.findUnique.mockResolvedValue(mockPermission);

      await repository.findById('perm-1');

      const callArg = prisma.permission.findUnique.mock.calls[0][0];
      expect(callArg.include.roles).toBeDefined();
    });

    it('should return null when permission does not exist', async () => {
      prisma.permission.findUnique.mockResolvedValue(null);

      const result = await repository.findById('nonexistent');

      expect(result).toBeNull();
    });
  });

  // ---------------------------------------------------------------------------
  // findByName
  // ---------------------------------------------------------------------------
  describe('findByName', () => {
    it('should call permission.findUnique with the given name', async () => {
      prisma.permission.findUnique.mockResolvedValue(mockPermission);

      await repository.findByName('read_users');

      expect(prisma.permission.findUnique).toHaveBeenCalledWith({ where: { name: 'read_users' } });
    });
  });

  // ---------------------------------------------------------------------------
  // findByNameExcludingId
  // ---------------------------------------------------------------------------
  describe('findByNameExcludingId', () => {
    it('should use findFirst with NOT id clause', async () => {
      prisma.permission.findFirst.mockResolvedValue(null);

      await repository.findByNameExcludingId('read_users', 'perm-2');

      expect(prisma.permission.findFirst).toHaveBeenCalledWith({
        where: { name: 'read_users', NOT: { id: 'perm-2' } },
      });
    });
  });

  // ---------------------------------------------------------------------------
  // findByIds
  // ---------------------------------------------------------------------------
  describe('findByIds', () => {
    it('should call permission.findMany with id in array', async () => {
      prisma.permission.findMany.mockResolvedValue([mockPermission]);

      const result = await repository.findByIds(['perm-1', 'perm-2']);

      expect(prisma.permission.findMany).toHaveBeenCalledWith({
        where: { id: { in: ['perm-1', 'perm-2'] } },
      });
      expect(result).toEqual([mockPermission]);
    });

    it('should return empty array when ids is empty', async () => {
      prisma.permission.findMany.mockResolvedValue([]);

      const result = await repository.findByIds([]);

      expect(result).toEqual([]);
    });
  });

  // ---------------------------------------------------------------------------
  // create
  // ---------------------------------------------------------------------------
  describe('create', () => {
    it('should call permission.create with the provided data', async () => {
      const created = { id: 'perm-new', name: 'create_roles', description: null, createdAt: new Date() };
      prisma.permission.create.mockResolvedValue(created);

      const result = await repository.create({ name: 'create_roles' } as any);

      expect(prisma.permission.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: { name: 'create_roles' } }),
      );
      expect(result).toEqual(created);
    });
  });

  // ---------------------------------------------------------------------------
  // update
  // ---------------------------------------------------------------------------
  describe('update', () => {
    it('should call permission.update with the given id and data', async () => {
      prisma.permission.update.mockResolvedValue(mockPermission);

      await repository.update('perm-1', { description: 'Updated desc' } as any);

      expect(prisma.permission.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'perm-1' },
          data: { description: 'Updated desc' },
        }),
      );
    });
  });

  // ---------------------------------------------------------------------------
  // delete
  // ---------------------------------------------------------------------------
  describe('delete', () => {
    it('should call permission.delete with the given id', async () => {
      prisma.permission.delete.mockResolvedValue(mockPermission);

      await repository.delete('perm-1');

      expect(prisma.permission.delete).toHaveBeenCalledWith({ where: { id: 'perm-1' } });
    });
  });
});
