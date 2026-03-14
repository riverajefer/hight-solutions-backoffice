import { Test, TestingModule } from '@nestjs/testing';
import { UsersRepository } from './users.repository';
import { PrismaService } from '../../database/prisma.service';
import {
  createMockPrismaService,
  MockPrismaService,
} from '../../database/prisma.service.mock';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------
const mockUser = {
  id: 'user-1',
  email: 'john@test.com',
  roleId: 'role-1',
  cargoId: 'cargo-1',
  firstName: 'John',
  lastName: 'Doe',
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
  role: { id: 'role-1', name: 'manager' },
  cargo: { id: 'cargo-1', name: 'Developer', area: { id: 'area-1', name: 'Engineering' } },
};

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------
describe('UsersRepository', () => {
  let repository: UsersRepository;
  let prisma: MockPrismaService;

  beforeEach(async () => {
    prisma = createMockPrismaService();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersRepository,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    repository = module.get<UsersRepository>(UsersRepository);
  });

  afterEach(() => jest.clearAllMocks());

  // ---------------------------------------------------------------------------
  // findAll
  // ---------------------------------------------------------------------------
  describe('findAll', () => {
    it('should call user.findMany ordered by createdAt desc', async () => {
      prisma.user.findMany.mockResolvedValue([mockUser]);

      const result = await repository.findAll();

      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ orderBy: { createdAt: 'desc' } }),
      );
      expect(result).toEqual([mockUser]);
    });

    it('should include role and cargo in the select', async () => {
      prisma.user.findMany.mockResolvedValue([mockUser]);

      await repository.findAll();

      const callArg = prisma.user.findMany.mock.calls[0][0];
      expect(callArg.select.role).toBeDefined();
      expect(callArg.select.cargo).toBeDefined();
    });
  });

  // ---------------------------------------------------------------------------
  // findById
  // ---------------------------------------------------------------------------
  describe('findById', () => {
    it('should call user.findUnique with the given id', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser);

      const result = await repository.findById('user-1');

      expect(prisma.user.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'user-1' } }),
      );
      expect(result).toEqual(mockUser);
    });

    it('should include role.permissions in the select', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser);

      await repository.findById('user-1');

      const callArg = prisma.user.findUnique.mock.calls[0][0];
      expect(callArg.select.role.select.permissions).toBeDefined();
    });

    it('should return null when user does not exist', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      const result = await repository.findById('nonexistent');

      expect(result).toBeNull();
    });
  });

  // ---------------------------------------------------------------------------
  // findByEmail
  // ---------------------------------------------------------------------------
  describe('findByEmail', () => {
    it('should call user.findUnique with the email', async () => {
      const userWithPassword = { ...mockUser, password: 'hashed', refreshToken: null };
      prisma.user.findUnique.mockResolvedValue(userWithPassword);

      const result = await repository.findByEmail('john@test.com');

      expect(prisma.user.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { email: 'john@test.com' } }),
      );
      expect(result).toEqual(userWithPassword);
    });

    it('should include password and refreshToken in the select', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await repository.findByEmail('john@test.com');

      const callArg = prisma.user.findUnique.mock.calls[0][0];
      expect(callArg.select.password).toBe(true);
      expect(callArg.select.refreshToken).toBe(true);
    });

    it('should return null when email is not found', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      const result = await repository.findByEmail('unknown@test.com');

      expect(result).toBeNull();
    });
  });

  // ---------------------------------------------------------------------------
  // findByEmailExcludingId
  // ---------------------------------------------------------------------------
  describe('findByEmailExcludingId', () => {
    it('should call user.findFirst with NOT id clause', async () => {
      prisma.user.findFirst.mockResolvedValue(mockUser);

      await repository.findByEmailExcludingId('john@test.com', 'user-2');

      expect(prisma.user.findFirst).toHaveBeenCalledWith({
        where: {
          email: 'john@test.com',
          NOT: { id: 'user-2' },
        },
      });
    });

    it('should return null when no duplicate email found', async () => {
      prisma.user.findFirst.mockResolvedValue(null);

      const result = await repository.findByEmailExcludingId('unique@test.com', 'user-1');

      expect(result).toBeNull();
    });
  });

  // ---------------------------------------------------------------------------
  // create
  // ---------------------------------------------------------------------------
  describe('create', () => {
    it('should call user.create with the provided data', async () => {
      prisma.user.create.mockResolvedValue(mockUser);
      const data = { email: 'new@test.com', password: 'hashed' } as any;

      const result = await repository.create(data);

      expect(prisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({ data }),
      );
      expect(result).toEqual(mockUser);
    });

    it('should include role and cargo in the select after create', async () => {
      prisma.user.create.mockResolvedValue(mockUser);

      await repository.create({ email: 'new@test.com' } as any);

      const callArg = prisma.user.create.mock.calls[0][0];
      expect(callArg.select.role).toBeDefined();
      expect(callArg.select.cargo).toBeDefined();
    });
  });

  // ---------------------------------------------------------------------------
  // update
  // ---------------------------------------------------------------------------
  describe('update', () => {
    it('should call user.update with the given id and data', async () => {
      prisma.user.update.mockResolvedValue(mockUser);

      await repository.update('user-1', { firstName: 'Jane' } as any);

      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'user-1' },
          data: { firstName: 'Jane' },
        }),
      );
    });
  });

  // ---------------------------------------------------------------------------
  // updateRefreshToken
  // ---------------------------------------------------------------------------
  describe('updateRefreshToken', () => {
    it('should update only the refreshToken field', async () => {
      prisma.user.update.mockResolvedValue({ ...mockUser, refreshToken: 'new-token' } as any);

      await repository.updateRefreshToken('user-1', 'new-token');

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { refreshToken: 'new-token' },
      });
    });

    it('should accept null to clear the refresh token', async () => {
      prisma.user.update.mockResolvedValue({ ...mockUser, refreshToken: null } as any);

      await repository.updateRefreshToken('user-1', null);

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { refreshToken: null },
      });
    });
  });

  // ---------------------------------------------------------------------------
  // delete
  // ---------------------------------------------------------------------------
  describe('delete', () => {
    it('should call user.delete with the given id', async () => {
      prisma.user.delete.mockResolvedValue(mockUser);

      await repository.delete('user-1');

      expect(prisma.user.delete).toHaveBeenCalledWith({ where: { id: 'user-1' } });
    });
  });
});
