import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { RolesService } from './roles.service';
import { RolesRepository } from './roles.repository';
import { PermissionsRepository } from '../permissions/permissions.repository';

const mockRolesRepository = {
  findAll: jest.fn(),
  findById: jest.fn(),
  findByName: jest.fn(),
  findByNameExcludingId: jest.fn(),
  create: jest.fn(),
  createWithPermissions: jest.fn(),
  update: jest.fn(),
  replacePermissions: jest.fn(),
  addPermissions: jest.fn(),
  removePermissions: jest.fn(),
  delete: jest.fn(),
};

const mockPermissionsRepository = {
  findAll: jest.fn(),
  findById: jest.fn(),
  findByName: jest.fn(),
  findByNameExcludingId: jest.fn(),
  findByIds: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
};

describe('RolesService', () => {
  let service: RolesService;

  // Fixture: rol como lo devuelve rolesRepository.findById
  const mockRoleFromRepo = {
    id: 'role-1',
    name: 'admin',
    description: 'Administrator role',
    createdAt: new Date(),
    updatedAt: new Date(),
    permissions: [
      { permission: { id: 'perm-1', name: 'read_users', description: 'Read users' } },
      { permission: { id: 'perm-2', name: 'create_users', description: 'Create users' } },
    ],
    users: [],
  };

  // Fixture: rol como lo devuelve findAll (con _count)
  const mockRoleFromFindAll = {
    ...mockRoleFromRepo,
    _count: { users: 0 },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RolesService,
        { provide: RolesRepository, useValue: mockRolesRepository },
        { provide: PermissionsRepository, useValue: mockPermissionsRepository },
      ],
    }).compile();

    service = module.get<RolesService>(RolesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ─────────────────────────────────────────────
  // findAll
  // ─────────────────────────────────────────────
  describe('findAll', () => {
    it('should return transformed roles with usersCount and flattened permissions', async () => {
      mockRolesRepository.findAll.mockResolvedValue([mockRoleFromFindAll]);

      const result = await service.findAll();

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: 'role-1',
        name: 'admin',
        usersCount: 0,
      });
      expect(result[0].permissions).toEqual([
        { id: 'perm-1', name: 'read_users', description: 'Read users' },
        { id: 'perm-2', name: 'create_users', description: 'Create users' },
      ]);
      // _count y la estructura anidada NO deben estar en el resultado
      expect(result[0]).not.toHaveProperty('_count');
    });

    it('should return empty array when no roles exist', async () => {
      mockRolesRepository.findAll.mockResolvedValue([]);

      const result = await service.findAll();

      expect(result).toEqual([]);
    });
  });

  // ─────────────────────────────────────────────
  // findOne
  // ─────────────────────────────────────────────
  describe('findOne', () => {
    it('should return transformed role with flattened permissions', async () => {
      mockRolesRepository.findById.mockResolvedValue(mockRoleFromRepo);

      const result = await service.findOne('role-1');

      expect(result).toMatchObject({ id: 'role-1', name: 'admin' });
      expect(result.permissions).toEqual([
        { id: 'perm-1', name: 'read_users', description: 'Read users' },
        { id: 'perm-2', name: 'create_users', description: 'Create users' },
      ]);
      expect(result.users).toEqual([]);
    });

    it('should throw NotFoundException when role does not exist', async () => {
      mockRolesRepository.findById.mockResolvedValue(null);

      await expect(service.findOne('bad-id')).rejects.toThrow(NotFoundException);
      await expect(service.findOne('bad-id')).rejects.toThrow(
        'Role with ID bad-id not found',
      );
    });
  });

  // ─────────────────────────────────────────────
  // create
  // ─────────────────────────────────────────────
  describe('create', () => {
    it('should create a role without permissions when permissionIds is not provided', async () => {
      mockRolesRepository.findByName.mockResolvedValue(null);
      mockRolesRepository.create.mockResolvedValue(mockRoleFromRepo);

      await service.create({ name: 'admin', description: 'Admin role' });

      expect(mockRolesRepository.create).toHaveBeenCalledWith({
        name: 'admin',
        description: 'Admin role',
      });
      expect(mockRolesRepository.createWithPermissions).not.toHaveBeenCalled();
    });

    it('should create a role with permissions when permissionIds is provided', async () => {
      mockRolesRepository.findByName.mockResolvedValue(null);
      mockRolesRepository.createWithPermissions.mockResolvedValue(mockRoleFromRepo);

      await service.create({
        name: 'editor',
        description: 'Editor role',
        permissionIds: ['perm-1', 'perm-2'],
      });

      expect(mockRolesRepository.createWithPermissions).toHaveBeenCalledWith(
        'editor',
        'Editor role',
        ['perm-1', 'perm-2'],
      );
      expect(mockRolesRepository.create).not.toHaveBeenCalled();
    });

    it('should return transformed role with flattened permissions', async () => {
      mockRolesRepository.findByName.mockResolvedValue(null);
      mockRolesRepository.create.mockResolvedValue(mockRoleFromRepo);

      const result = await service.create({ name: 'admin' });

      expect(result).toMatchObject({ id: 'role-1', name: 'admin' });
      expect(result.permissions).toEqual([
        { id: 'perm-1', name: 'read_users', description: 'Read users' },
        { id: 'perm-2', name: 'create_users', description: 'Create users' },
      ]);
    });

    it('should throw BadRequestException when role name already exists', async () => {
      mockRolesRepository.findByName.mockResolvedValue({ id: 'existing', name: 'admin' });

      await expect(service.create({ name: 'admin' })).rejects.toThrow(BadRequestException);
      await expect(service.create({ name: 'admin' })).rejects.toThrow(
        'Role name already exists',
      );
      expect(mockRolesRepository.create).not.toHaveBeenCalled();
    });
  });

  // ─────────────────────────────────────────────
  // update
  // ─────────────────────────────────────────────
  describe('update', () => {
    beforeEach(() => {
      mockRolesRepository.findById.mockResolvedValue(mockRoleFromRepo);
      mockRolesRepository.findByNameExcludingId.mockResolvedValue(null);
      mockRolesRepository.update.mockResolvedValue({
        ...mockRoleFromRepo,
        name: 'updated-name',
      });
    });

    it('should update role and return transformed data', async () => {
      const result = await service.update('role-1', { name: 'updated-name' });

      expect(mockRolesRepository.update).toHaveBeenCalledWith('role-1', { name: 'updated-name' });
      expect(result).toMatchObject({ id: 'role-1', name: 'updated-name' });
    });

    it('should throw NotFoundException when role does not exist', async () => {
      mockRolesRepository.findById.mockResolvedValue(null);

      await expect(service.update('bad-id', { name: 'x' })).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when new name is already used by another role', async () => {
      mockRolesRepository.findByNameExcludingId.mockResolvedValue({ id: 'other-role' });

      await expect(service.update('role-1', { name: 'taken' })).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.update('role-1', { name: 'taken' })).rejects.toThrow(
        'Role name already in use',
      );
    });

    it('should not check name uniqueness when name is not being updated', async () => {
      await service.update('role-1', { description: 'new desc' });

      expect(mockRolesRepository.findByNameExcludingId).not.toHaveBeenCalled();
    });
  });

  // ─────────────────────────────────────────────
  // assignPermissions
  // ─────────────────────────────────────────────
  describe('assignPermissions', () => {
    const permissionIds = ['perm-1', 'perm-2'];

    beforeEach(() => {
      // findOne (findById) — primera llamada para validar rol
      // segunda llamada al final para retornar el rol actualizado
      mockRolesRepository.findById.mockResolvedValue(mockRoleFromRepo);
      mockPermissionsRepository.findByIds.mockResolvedValue([
        { id: 'perm-1' },
        { id: 'perm-2' },
      ]);
      mockRolesRepository.replacePermissions.mockResolvedValue([{}, {}]);
    });

    it('should replace permissions and return updated role', async () => {
      const result = await service.assignPermissions('role-1', { permissionIds });

      expect(mockRolesRepository.replacePermissions).toHaveBeenCalledWith(
        'role-1',
        permissionIds,
      );
      expect(result).toMatchObject({ id: 'role-1' });
    });

    it('should throw NotFoundException when role does not exist', async () => {
      mockRolesRepository.findById.mockResolvedValue(null);

      await expect(
        service.assignPermissions('bad-id', { permissionIds }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when some permissionIds are invalid', async () => {
      // Solo retorna 1 de los 2 permisos pedidos → alguno no existe
      mockPermissionsRepository.findByIds.mockResolvedValue([{ id: 'perm-1' }]);

      await expect(
        service.assignPermissions('role-1', { permissionIds }),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.assignPermissions('role-1', { permissionIds }),
      ).rejects.toThrow('One or more permission IDs are invalid');
      expect(mockRolesRepository.replacePermissions).not.toHaveBeenCalled();
    });
  });

  // ─────────────────────────────────────────────
  // addPermissions
  // ─────────────────────────────────────────────
  describe('addPermissions', () => {
    it('should add only new permissions (skip already assigned)', async () => {
      // El rol ya tiene perm-1 asignado
      mockRolesRepository.findById.mockResolvedValue(mockRoleFromRepo);
      mockPermissionsRepository.findByIds.mockResolvedValue([
        { id: 'perm-1' },
        { id: 'perm-3' },
      ]);
      mockRolesRepository.addPermissions.mockResolvedValue({});

      await service.addPermissions('role-1', { permissionIds: ['perm-1', 'perm-3'] });

      // perm-1 ya existe, solo debe agregar perm-3
      expect(mockRolesRepository.addPermissions).toHaveBeenCalledWith('role-1', ['perm-3']);
    });

    it('should not call addPermissions when all permissions already assigned', async () => {
      mockRolesRepository.findById.mockResolvedValue(mockRoleFromRepo);
      // Los dos permisos ya están en el rol (perm-1 y perm-2)
      mockPermissionsRepository.findByIds.mockResolvedValue([
        { id: 'perm-1' },
        { id: 'perm-2' },
      ]);

      await service.addPermissions('role-1', { permissionIds: ['perm-1', 'perm-2'] });

      expect(mockRolesRepository.addPermissions).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when some permissionIds are invalid', async () => {
      mockRolesRepository.findById.mockResolvedValue(mockRoleFromRepo);
      mockPermissionsRepository.findByIds.mockResolvedValue([{ id: 'perm-1' }]);

      await expect(
        service.addPermissions('role-1', { permissionIds: ['perm-1', 'bad-perm'] }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ─────────────────────────────────────────────
  // removePermissions
  // ─────────────────────────────────────────────
  describe('removePermissions', () => {
    it('should remove permissions and return updated role', async () => {
      mockRolesRepository.findById.mockResolvedValue(mockRoleFromRepo);
      mockRolesRepository.removePermissions.mockResolvedValue({});

      await service.removePermissions('role-1', { permissionIds: ['perm-1'] });

      expect(mockRolesRepository.removePermissions).toHaveBeenCalledWith('role-1', ['perm-1']);
    });

    it('should throw NotFoundException when role does not exist', async () => {
      mockRolesRepository.findById.mockResolvedValue(null);

      await expect(
        service.removePermissions('bad-id', { permissionIds: ['perm-1'] }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ─────────────────────────────────────────────
  // remove
  // ─────────────────────────────────────────────
  describe('remove', () => {
    it('should delete role and return success message', async () => {
      mockRolesRepository.findById.mockResolvedValue(mockRoleFromRepo); // users: []
      mockRolesRepository.delete.mockResolvedValue({});

      const result = await service.remove('role-1');

      expect(mockRolesRepository.delete).toHaveBeenCalledWith('role-1');
      expect(result).toEqual({ message: 'Role "admin" deleted successfully' });
    });

    it('should throw NotFoundException when role does not exist', async () => {
      mockRolesRepository.findById.mockResolvedValue(null);

      await expect(service.remove('bad-id')).rejects.toThrow(NotFoundException);
      expect(mockRolesRepository.delete).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when role has assigned users', async () => {
      mockRolesRepository.findById.mockResolvedValue({
        ...mockRoleFromRepo,
        users: [{ id: 'user-1', email: 'user@example.com' }],
      });

      await expect(service.remove('role-1')).rejects.toThrow(BadRequestException);
      await expect(service.remove('role-1')).rejects.toThrow(
        'Cannot delete role with assigned users',
      );
      expect(mockRolesRepository.delete).not.toHaveBeenCalled();
    });
  });
});
