import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateRoleDto, UpdateRoleDto, AssignPermissionsDto } from './dto';

@Injectable()
export class RolesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Obtiene todos los roles con sus permisos
   */
  async findAll() {
    const roles = await this.prisma.role.findMany({
      include: {
        permissions: {
          include: {
            permission: {
              select: {
                id: true,
                name: true,
                description: true,
              },
            },
          },
        },
        _count: {
          select: { users: true },
        },
      },
      orderBy: { name: 'asc' },
    });

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
    const role = await this.prisma.role.findUnique({
      where: { id },
      include: {
        permissions: {
          include: {
            permission: {
              select: {
                id: true,
                name: true,
                description: true,
              },
            },
          },
        },
        users: {
          select: {
            id: true,
            email: true,
          },
        },
      },
    });

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
    const existingRole = await this.prisma.role.findUnique({
      where: { name: createRoleDto.name },
    });

    if (existingRole) {
      throw new BadRequestException('Role name already exists');
    }

    // Crear el rol con o sin permisos iniciales
    const role = await this.prisma.role.create({
      data: {
        name: createRoleDto.name,
        ...(createRoleDto.permissionIds && {
          permissions: {
            create: createRoleDto.permissionIds.map((permissionId) => ({
              permission: { connect: { id: permissionId } },
            })),
          },
        }),
      },
      include: {
        permissions: {
          include: {
            permission: {
              select: {
                id: true,
                name: true,
                description: true,
              },
            },
          },
        },
      },
    });

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
      const existingRole = await this.prisma.role.findFirst({
        where: {
          name: updateRoleDto.name,
          NOT: { id },
        },
      });

      if (existingRole) {
        throw new BadRequestException('Role name already in use');
      }
    }

    return this.prisma.role.update({
      where: { id },
      data: updateRoleDto,
      select: {
        id: true,
        name: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  /**
   * Asigna permisos a un rol (reemplaza los existentes)
   */
  async assignPermissions(id: string, assignPermissionsDto: AssignPermissionsDto) {
    await this.findOne(id);

    // Verificar que todos los permisos existen
    const permissions = await this.prisma.permission.findMany({
      where: { id: { in: assignPermissionsDto.permissionIds } },
    });

    if (permissions.length !== assignPermissionsDto.permissionIds.length) {
      throw new BadRequestException('One or more permission IDs are invalid');
    }

    // Eliminar permisos actuales y asignar nuevos
    await this.prisma.$transaction([
      this.prisma.rolePermission.deleteMany({
        where: { roleId: id },
      }),
      this.prisma.rolePermission.createMany({
        data: assignPermissionsDto.permissionIds.map((permissionId) => ({
          roleId: id,
          permissionId,
        })),
      }),
    ]);

    return this.findOne(id);
  }

  /**
   * Agrega permisos a un rol (sin eliminar existentes)
   */
  async addPermissions(id: string, assignPermissionsDto: AssignPermissionsDto) {
    const role = await this.findOne(id);

    // Verificar que todos los permisos existen
    const permissions = await this.prisma.permission.findMany({
      where: { id: { in: assignPermissionsDto.permissionIds } },
    });

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
      await this.prisma.rolePermission.createMany({
        data: newPermissionIds.map((permissionId) => ({
          roleId: id,
          permissionId,
        })),
      });
    }

    return this.findOne(id);
  }

  /**
   * Remueve permisos de un rol
   */
  async removePermissions(id: string, assignPermissionsDto: AssignPermissionsDto) {
    await this.findOne(id);

    await this.prisma.rolePermission.deleteMany({
      where: {
        roleId: id,
        permissionId: { in: assignPermissionsDto.permissionIds },
      },
    });

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

    await this.prisma.role.delete({
      where: { id },
    });

    return { message: `Role "${role.name}" deleted successfully` };
  }
}
