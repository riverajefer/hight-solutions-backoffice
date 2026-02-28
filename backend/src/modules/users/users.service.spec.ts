import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersRepository } from './users.repository';
import { RolesRepository } from '../roles/roles.repository';
import { CargosRepository } from '../cargos/cargos.repository';

jest.mock('bcrypt', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

import * as bcrypt from 'bcrypt';

const mockUsersRepository = {
  findAll: jest.fn(),
  findById: jest.fn(),
  findByEmail: jest.fn(),
  findByUsername: jest.fn(),
  findByEmailExcludingId: jest.fn(),
  findByUsernameExcludingId: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  updateRefreshToken: jest.fn(),
  delete: jest.fn(),
};

const mockRolesRepository = {
  findAll: jest.fn(),
  findById: jest.fn(),
  findByName: jest.fn(),
  findByNameExcludingId: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
};

const mockCargosRepository = {
  findAll: jest.fn(),
  findById: jest.fn(),
  findByArea: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
};

describe('UsersService', () => {
  let service: UsersService;

  // Fixture: a user as returned from usersRepository.findById (with nested permissions)
  const mockUserFromRepo = {
    id: 'user-1',
    email: 'test@example.com',
    firstName: 'John',
    lastName: 'Doe',
    profilePhoto: null,
    roleId: 'role-1',
    cargoId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    role: {
      id: 'role-1',
      name: 'admin',
      permissions: [
        { permission: { id: 'perm-1', name: 'read_users', description: 'Read users' } },
        { permission: { id: 'perm-2', name: 'create_users', description: 'Create users' } },
      ],
    },
    cargo: null,
  };

  const mockRole = { id: 'role-1', name: 'admin', description: 'Administrator' };
  const mockCargo = { id: 'cargo-1', name: 'Developer', isActive: true };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: UsersRepository, useValue: mockUsersRepository },
        { provide: RolesRepository, useValue: mockRolesRepository },
        { provide: CargosRepository, useValue: mockCargosRepository },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ─────────────────────────────────────────────
  // findAll
  // ─────────────────────────────────────────────
  describe('findAll', () => {
    it('should delegate to usersRepository.findAll', async () => {
      mockUsersRepository.findAll.mockResolvedValue([mockUserFromRepo]);

      const result = await service.findAll();

      expect(mockUsersRepository.findAll).toHaveBeenCalledTimes(1);
      expect(result).toEqual([mockUserFromRepo]);
    });
  });

  // ─────────────────────────────────────────────
  // findOne
  // ─────────────────────────────────────────────
  describe('findOne', () => {
    it('should return user with permissions flattened (rp.permission unwrapped)', async () => {
      mockUsersRepository.findById.mockResolvedValue(mockUserFromRepo);

      const result = await service.findOne('user-1');

      expect(result.role.permissions).toEqual([
        { id: 'perm-1', name: 'read_users', description: 'Read users' },
        { id: 'perm-2', name: 'create_users', description: 'Create users' },
      ]);
      expect(result.id).toBe('user-1');
    });

    it('should throw NotFoundException when user does not exist', async () => {
      mockUsersRepository.findById.mockResolvedValue(null);

      await expect(service.findOne('nonexistent-id')).rejects.toThrow(NotFoundException);
      await expect(service.findOne('nonexistent-id')).rejects.toThrow(
        'User with ID nonexistent-id not found',
      );
    });
  });

  // ─────────────────────────────────────────────
  // create
  // ─────────────────────────────────────────────
  describe('create', () => {
    const createDto = {
      email: 'new@example.com',
      password: 'plain-password',
      firstName: 'Jane',
      lastName: 'Smith',
      roleId: 'role-1',
      cargoId: undefined as string | undefined,
    };

    beforeEach(() => {
      mockUsersRepository.findByEmail.mockResolvedValue(null);
      mockRolesRepository.findById.mockResolvedValue(mockRole);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');
      mockUsersRepository.create.mockResolvedValue({ id: 'new-user', ...createDto });
    });

    it('should create user with hashed password when no cargoId is provided', async () => {
      await service.create(createDto);

      expect(bcrypt.hash).toHaveBeenCalledWith(createDto.password, 12);
      expect(mockUsersRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          password: 'hashed-password',
          email: createDto.email,
          role: { connect: { id: createDto.roleId } },
        }),
      );
      // cargo should NOT be in the create call when cargoId is undefined
      const callArg = mockUsersRepository.create.mock.calls[0][0];
      expect(callArg).not.toHaveProperty('cargo');
    });

    it('should create user with cargo connect when cargoId is provided and active', async () => {
      mockCargosRepository.findById.mockResolvedValue(mockCargo);
      const dtoWithCargo = { ...createDto, cargoId: 'cargo-1' };

      await service.create(dtoWithCargo);

      const callArg = mockUsersRepository.create.mock.calls[0][0];
      expect(callArg).toHaveProperty('cargo', { connect: { id: 'cargo-1' } });
    });

    it('should throw BadRequestException when email already registered', async () => {
      mockUsersRepository.findByEmail.mockResolvedValue({ id: 'existing' });

      await expect(service.create(createDto)).rejects.toThrow(BadRequestException);
      await expect(service.create(createDto)).rejects.toThrow('Email already registered');
      expect(mockRolesRepository.findById).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when roleId is invalid', async () => {
      mockRolesRepository.findById.mockResolvedValue(null);

      await expect(service.create(createDto)).rejects.toThrow(BadRequestException);
      await expect(service.create(createDto)).rejects.toThrow('Invalid role ID');
    });

    it('should throw BadRequestException when cargoId is invalid', async () => {
      mockCargosRepository.findById.mockResolvedValue(null);
      const dtoWithCargo = { ...createDto, cargoId: 'bad-cargo-id' };

      await expect(service.create(dtoWithCargo)).rejects.toThrow(BadRequestException);
      await expect(service.create(dtoWithCargo)).rejects.toThrow('Invalid cargo ID');
    });

    it('should throw BadRequestException when cargo is inactive', async () => {
      mockCargosRepository.findById.mockResolvedValue({ ...mockCargo, isActive: false });
      const dtoWithCargo = { ...createDto, cargoId: 'cargo-1' };

      await expect(service.create(dtoWithCargo)).rejects.toThrow(BadRequestException);
      await expect(service.create(dtoWithCargo)).rejects.toThrow(
        'Cannot assign an inactive cargo',
      );
    });
  });

  // ─────────────────────────────────────────────
  // update
  // ─────────────────────────────────────────────
  describe('update', () => {
    beforeEach(() => {
      // findOne (findById) call inside update
      mockUsersRepository.findById.mockResolvedValue(mockUserFromRepo);
      mockUsersRepository.findByEmailExcludingId.mockResolvedValue(null);
      mockRolesRepository.findById.mockResolvedValue(mockRole);
      mockCargosRepository.findById.mockResolvedValue(mockCargo);
      mockUsersRepository.update.mockResolvedValue({ ...mockUserFromRepo });
    });

    it('should update user data without hashing password when password is not provided', async () => {
      await service.update('user-1', { firstName: 'Updated' });

      expect(bcrypt.hash).not.toHaveBeenCalled();
    });

    it('should hash new password when password field is provided', async () => {
      (bcrypt.hash as jest.Mock).mockResolvedValue('new-hashed-password');

      await service.update('user-1', { password: 'new-plain-password' });

      expect(bcrypt.hash).toHaveBeenCalledWith('new-plain-password', 12);
      const callArg = mockUsersRepository.update.mock.calls[0][1];
      expect(callArg).toHaveProperty('password', 'new-hashed-password');
    });

    it('should use Prisma connect syntax when roleId is provided', async () => {
      await service.update('user-1', { roleId: 'role-1' });

      const callArg = mockUsersRepository.update.mock.calls[0][1];
      expect(callArg).toHaveProperty('role', { connect: { id: 'role-1' } });
    });

    it('should use Prisma disconnect syntax when cargoId is explicitly null', async () => {
      await service.update('user-1', { cargoId: null });

      const callArg = mockUsersRepository.update.mock.calls[0][1];
      expect(callArg).toHaveProperty('cargo', { disconnect: true });
    });

    it('should use Prisma connect syntax when cargoId has a value', async () => {
      await service.update('user-1', { cargoId: 'cargo-1' });

      const callArg = mockUsersRepository.update.mock.calls[0][1];
      expect(callArg).toHaveProperty('cargo', { connect: { id: 'cargo-1' } });
    });

    it('should throw NotFoundException when user does not exist', async () => {
      mockUsersRepository.findById.mockResolvedValue(null);

      await expect(service.update('bad-id', { firstName: 'X' })).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when new email is already used by another user', async () => {
      mockUsersRepository.findByEmailExcludingId.mockResolvedValue({ id: 'other-user' });

      await expect(service.update('user-1', { email: 'taken@example.com' })).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.update('user-1', { email: 'taken@example.com' })).rejects.toThrow(
        'Email already in use',
      );
    });

    it('should throw BadRequestException when new roleId is invalid', async () => {
      mockRolesRepository.findById.mockResolvedValue(null);

      await expect(service.update('user-1', { roleId: 'invalid-role' })).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.update('user-1', { roleId: 'invalid-role' })).rejects.toThrow(
        'Invalid role ID',
      );
    });
  });

  // ─────────────────────────────────────────────
  // remove
  // ─────────────────────────────────────────────
  describe('remove', () => {
    it('should delete user and return success message', async () => {
      mockUsersRepository.findById.mockResolvedValue(mockUserFromRepo);
      mockUsersRepository.delete.mockResolvedValue(mockUserFromRepo);

      const result = await service.remove('user-1');

      expect(mockUsersRepository.delete).toHaveBeenCalledWith('user-1');
      expect(result).toEqual({ message: 'User with ID user-1 deleted successfully' });
    });

    it('should throw NotFoundException when user does not exist', async () => {
      mockUsersRepository.findById.mockResolvedValue(null);

      await expect(service.remove('bad-id')).rejects.toThrow(NotFoundException);
      expect(mockUsersRepository.delete).not.toHaveBeenCalled();
    });
  });
});
