import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { CreateRoleDto, UpdateRoleDto, AssignPermissionsDto } from './dto';
import { RolesRepository } from './roles.repository';
import { PermissionsRepository } from '../permissions/permissions.repository';
import {
  ADMIN_ROLE_NAME,
  isReservedAdminName,
  RolePrivilegeService,
} from './role-privilege.service';

@Injectable()
export class RolesService {
  constructor(
    private readonly rolesRepository: RolesRepository,
    private readonly permissionsRepository: PermissionsRepository,
    private readonly rolePrivilegeService: RolePrivilegeService,
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
      description: role.description,
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
      description: role.description,
      createdAt: role.createdAt,
      updatedAt: role.updatedAt,
      permissions: role.permissions.map((rp) => rp.permission),
      users: role.users,
    };
  }

  /**
   * Crea un nuevo rol
   */
  async create(createRoleDto: CreateRoleDto, actorRoleId: string) {
    // El sistema reconoce al administrador por el nombre del rol. Un «Admin»
    // o «ADMIN» pasaba como tal en las comprobaciones que ignoran mayúsculas.
    if (isReservedAdminName(createRoleDto.name)) {
      throw new BadRequestException(
        `El nombre «${createRoleDto.name}» está reservado para el rol de administrador`,
      );
    }

    // Crear un rol con permisos es otorgarlos: solo los que ya tienes.
    if (createRoleDto.permissionIds?.length) {
      await this.rolePrivilegeService.assertCanGrantPermissions(
        actorRoleId,
        createRoleDto.permissionIds,
      );
    }

    // Verificar si el nombre ya existe
    const existingRole = await this.rolesRepository.findByName(createRoleDto.name);

    if (existingRole) {
      throw new BadRequestException('Role name already exists');
    }

    // Crear el rol con o sin permisos iniciales
    const role = createRoleDto.permissionIds
      ? await this.rolesRepository.createWithPermissions(
          createRoleDto.name,
          createRoleDto.description,
          createRoleDto.permissionIds,
        )
      : await this.rolesRepository.create({
          name: createRoleDto.name,
          description: createRoleDto.description,
        });

    return {
      id: role.id,
      name: role.name,
      description: role.description,
      createdAt: role.createdAt,
      permissions: role.permissions.map((rp) => rp.permission),
    };
  }

  /**
   * Actualiza un rol
   */
  async update(id: string, updateRoleDto: UpdateRoleDto, actorRoleId: string) {
    const current = await this.findOne(id);
    await this.rolePrivilegeService.assertCanManageRole(actorRoleId, id);
    this.assertNameChangeAllowed(current.name, updateRoleDto.name);

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

    const role = await this.rolesRepository.update(id, updateRoleDto);

    return {
      id: role.id,
      name: role.name,
      description: role.description,
      createdAt: role.createdAt,
      updatedAt: role.updatedAt,
      permissions: role.permissions.map((rp) => rp.permission),
    };
  }

  /**
   * Asigna permisos a un rol (reemplaza los existentes)
   */
  async assignPermissions(
    id: string,
    assignPermissionsDto: AssignPermissionsDto,
    actorRoleId: string,
  ) {
    await this.findOne(id);

    // Verificar que todos los permisos existen
    const permissions = await this.permissionsRepository.findByIds(
      assignPermissionsDto.permissionIds,
    );

    if (permissions.length !== assignPermissionsDto.permissionIds.length) {
      throw new BadRequestException('One or more permission IDs are invalid');
    }

    // Reemplazar los permisos toca dos conjuntos: los que tenía el rol (se
    // pueden quitar) y los nuevos (se otorgan). Los dos deben ser tuyos.
    await this.rolePrivilegeService.assertCanManageRole(actorRoleId, id);
    await this.rolePrivilegeService.assertCanGrantPermissions(
      actorRoleId,
      assignPermissionsDto.permissionIds,
    );

    // Eliminar permisos actuales y asignar nuevos
    await this.rolesRepository.replacePermissions(id, assignPermissionsDto.permissionIds);

    return this.findOne(id);
  }

  /**
   * Agrega permisos a un rol (sin eliminar existentes)
   */
  async addPermissions(
    id: string,
    assignPermissionsDto: AssignPermissionsDto,
    actorRoleId: string,
  ) {
    const role = await this.findOne(id);

    // Verificar que todos los permisos existen
    const permissions = await this.permissionsRepository.findByIds(
      assignPermissionsDto.permissionIds,
    );

    if (permissions.length !== assignPermissionsDto.permissionIds.length) {
      throw new BadRequestException('One or more permission IDs are invalid');
    }

    await this.rolePrivilegeService.assertCanManageRole(actorRoleId, id);
    await this.rolePrivilegeService.assertCanGrantPermissions(
      actorRoleId,
      assignPermissionsDto.permissionIds,
    );

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
  async removePermissions(
    id: string,
    assignPermissionsDto: AssignPermissionsDto,
    actorRoleId: string,
  ) {
    await this.findOne(id);
    // Quitarle permisos a un rol más alto que el tuyo también es tocar lo que
    // no te corresponde (por ejemplo, dejar al admin sin acceso).
    await this.rolePrivilegeService.assertCanManageRole(actorRoleId, id);

    await this.rolesRepository.removePermissions(id, assignPermissionsDto.permissionIds);

    return this.findOne(id);
  }

  /**
   * Elimina un rol
   */
  async remove(id: string, actorRoleId: string) {
    const role = await this.findOne(id);

    if (role.name === ADMIN_ROLE_NAME) {
      throw new BadRequestException(
        'El rol de administrador no se puede eliminar',
      );
    }
    await this.rolePrivilegeService.assertCanManageRole(actorRoleId, id);

    // No permitir eliminar roles que tienen usuarios asignados
    if (role.users.length > 0) {
      throw new BadRequestException(
        'Cannot delete role with assigned users. Reassign users first.',
      );
    }

    await this.rolesRepository.delete(id);

    return { message: `Role "${role.name}" deleted successfully` };
  }

  /**
   * El rol `admin` no se puede renombrar —el sistema lo busca por nombre en
   * decenas de lugares y dejarían de funcionar las aprobaciones— y ningún otro
   * rol puede tomar ese nombre.
   */
  private assertNameChangeAllowed(currentName: string, newName?: string) {
    if (newName === undefined || newName === currentName) return;

    if (currentName === ADMIN_ROLE_NAME) {
      throw new BadRequestException(
        'El rol de administrador no se puede renombrar',
      );
    }
    if (isReservedAdminName(newName)) {
      throw new BadRequestException(
        `El nombre «${newName}» está reservado para el rol de administrador`,
      );
    }
  }
}
