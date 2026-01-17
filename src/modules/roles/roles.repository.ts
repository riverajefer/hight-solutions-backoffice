import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { Prisma } from '../../generated/prisma';

@Injectable()
export class RolesRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Encuentra todos los roles con sus permisos
   */
  async findAll() {
    return this.prisma.role.findMany({
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
  }

  /**
   * Encuentra un rol por ID con sus permisos y usuarios
   */
  async findById(id: string) {
    return this.prisma.role.findUnique({
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
  }

  /**
   * Encuentra un rol por nombre
   */
  async findByName(name: string) {
    return this.prisma.role.findUnique({
      where: { name },
    });
  }

  /**
   * Encuentra un rol por nombre excluyendo un ID específico
   */
  async findByNameExcludingId(name: string, excludeId: string) {
    return this.prisma.role.findFirst({
      where: {
        name,
        NOT: { id: excludeId },
      },
    });
  }

  /**
   * Crea un nuevo rol
   */
  async create(data: Prisma.RoleCreateInput) {
    return this.prisma.role.create({
      data,
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
  }

  /**
   * Crea un rol con permisos
   */
  async createWithPermissions(name: string, permissionIds: string[]) {
    return this.prisma.role.create({
      data: {
        name,
        permissions: {
          create: permissionIds.map((permissionId) => ({
            permission: { connect: { id: permissionId } },
          })),
        },
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
  }

  /**
   * Actualiza un rol
   */
  async update(id: string, data: Prisma.RoleUpdateInput) {
    return this.prisma.role.update({
      where: { id },
      data,
      select: {
        id: true,
        name: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  /**
   * Elimina todos los permisos de un rol y asigna nuevos
   */
  async replacePermissions(roleId: string, permissionIds: string[]) {
    return this.prisma.$transaction([
      this.prisma.rolePermission.deleteMany({
        where: { roleId },
      }),
      this.prisma.rolePermission.createMany({
        data: permissionIds.map((permissionId) => ({
          roleId,
          permissionId,
        })),
      }),
    ]);
  }

  /**
   * Agrega permisos a un rol
   */
  async addPermissions(roleId: string, permissionIds: string[]) {
    return this.prisma.rolePermission.createMany({
      data: permissionIds.map((permissionId) => ({
        roleId,
        permissionId,
      })),
    });
  }

  /**
   * Remueve permisos de un rol
   */
  async removePermissions(roleId: string, permissionIds: string[]) {
    return this.prisma.rolePermission.deleteMany({
      where: {
        roleId,
        permissionId: { in: permissionIds },
      },
    });
  }

  /**
   * Elimina un rol
   */
  async delete(id: string) {
    return this.prisma.role.delete({
      where: { id },
    });
  }
}
