import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { CreateRoleDto, UpdateRoleDto, AssignPermissionsDto } from './dto';
import { RolesRepository } from './roles.repository';
import { PermissionsRepository } from '../permissions/permissions.repository';

@Injectable()
export class RolesService {
  constructor(
    private readonly rolesRepository: RolesRepository,
    private readonly permissionsRepository: PermissionsRepository,
  ) {}

  /**
   * Obtiene todos los roles con sus permisos
   */
  async findAll() {
    const roles = await this.rolesRepository.findAll();

    // Transformar la estructura para mejor legibilidad
    return roles.map((role) => ({
      id: role.id,
      name: role.name,
      createdAt: role.createdAt,
      updatedAt: role.updatedAt,
      usersCount: role._count.users,
      permissions: role.permissions.map((rp) => rp.permission),
    }));
  }

  /**
   * Obtiene un rol por ID
   */
  async findOne(id: string) {
    const role = await this.rolesRepository.findById(id);

    if (!role) {
      throw new NotFoundException(`Role with ID ${id} not found`);
    }

    return {
      id: role.id,
      name: role.name,
      createdAt: role.createdAt,
      updatedAt: role.updatedAt,
      permissions: role.permissions.map((rp) => rp.permission),
      users: role.users,
    };
  }

  /**
   * Crea un nuevo rol
   */
  async create(createRoleDto: CreateRoleDto) {
    // Verificar si el nombre ya existe
    const existingRole = await this.rolesRepository.findByName(createRoleDto.name);

    if (existingRole) {
      throw new BadRequestException('Role name already exists');
    }

    // Crear el rol con o sin permisos iniciales
    const role = createRoleDto.permissionIds
      ? await this.rolesRepository.createWithPermissions(
          createRoleDto.name,
          createRoleDto.permissionIds,
        )
      : await this.rolesRepository.create({ name: createRoleDto.name });

    return {
      id: role.id,
      name: role.name,
      createdAt: role.createdAt,
      permissions: role.permissions.map((rp) => rp.permission),
    };
  }

  /**
   * Actualiza un rol
   */
  async update(id: string, updateRoleDto: UpdateRoleDto) {
    await this.findOne(id);

    // Verificar si el nuevo nombre ya existe
    if (updateRoleDto.name) {
      const existingRole = await this.rolesRepository.findByNameExcludingId(
        updateRoleDto.name,
        id,
      );

      if (existingRole) {
        throw new BadRequestException('Role name already in use');
      }
    }

    return this.rolesRepository.update(id, updateRoleDto);
  }

  /**
   * Asigna permisos a un rol (reemplaza los existentes)
   */
  async assignPermissions(id: string, assignPermissionsDto: AssignPermissionsDto) {
    await this.findOne(id);

    // Verificar que todos los permisos existen
    const permissions = await this.permissionsRepository.findByIds(
      assignPermissionsDto.permissionIds,
    );

    if (permissions.length !== assignPermissionsDto.permissionIds.length) {
      throw new BadRequestException('One or more permission IDs are invalid');
    }

    // Eliminar permisos actuales y asignar nuevos
    await this.rolesRepository.replacePermissions(id, assignPermissionsDto.permissionIds);

    return this.findOne(id);
  }

  /**
   * Agrega permisos a un rol (sin eliminar existentes)
   */
  async addPermissions(id: string, assignPermissionsDto: AssignPermissionsDto) {
    const role = await this.findOne(id);

    // Verificar que todos los permisos existen
    const permissions = await this.permissionsRepository.findByIds(
      assignPermissionsDto.permissionIds,
    );

    if (permissions.length !== assignPermissionsDto.permissionIds.length) {
      throw new BadRequestException('One or more permission IDs are invalid');
    }

    // Obtener permisos ya asignados
    const existingPermissionIds = role.permissions.map((p) => p.id);
    
    // Filtrar solo los permisos nuevos
    const newPermissionIds = assignPermissionsDto.permissionIds.filter(
      (permissionId) => !existingPermissionIds.includes(permissionId),
    );

    // Agregar solo permisos nuevos
    if (newPermissionIds.length > 0) {
      await this.rolesRepository.addPermissions(id, newPermissionIds);
    }

    return this.findOne(id);
  }

  /**
   * Remueve permisos de un rol
   */
  async removePermissions(id: string, assignPermissionsDto: AssignPermissionsDto) {
    await this.findOne(id);

    await this.rolesRepository.removePermissions(id, assignPermissionsDto.permissionIds);

    return this.findOne(id);
  }

  /**
   * Elimina un rol
   */
  async remove(id: string) {
    const role = await this.findOne(id);

    // No permitir eliminar roles que tienen usuarios asignados
    if (role.users.length > 0) {
      throw new BadRequestException(
        'Cannot delete role with assigned users. Reassign users first.',
      );
    }

    await this.rolesRepository.delete(id);

    return { message: `Role "${role.name}" deleted successfully` };
  }
}
