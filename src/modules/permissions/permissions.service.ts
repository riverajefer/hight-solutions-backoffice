import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePermissionDto, UpdatePermissionDto } from './dto';

@Injectable()
export class PermissionsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Obtiene todos los permisos
   */
  async findAll() {
    return this.prisma.permission.findMany({
      select: {
        id: true,
        name: true,
        description: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: { roles: true },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  /**
   * Obtiene un permiso por ID
   */
  async findOne(id: string) {
    const permission = await this.prisma.permission.findUnique({
      where: { id },
      include: {
        roles: {
          include: {
            role: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    if (!permission) {
      throw new NotFoundException(`Permission with ID ${id} not found`);
    }

    return {
      id: permission.id,
      name: permission.name,
      description: permission.description,
      createdAt: permission.createdAt,
      updatedAt: permission.updatedAt,
      roles: permission.roles.map((rp: { role: { id: string; name: string } }) => rp.role),
    };
  }

  /**
   * Crea un nuevo permiso
   */
  async create(createPermissionDto: CreatePermissionDto) {
    // Verificar si el nombre ya existe
    const existingPermission = await this.prisma.permission.findUnique({
      where: { name: createPermissionDto.name },
    });

    if (existingPermission) {
      throw new BadRequestException('Permission name already exists');
    }

    return this.prisma.permission.create({
      data: createPermissionDto,
      select: {
        id: true,
        name: true,
        description: true,
        createdAt: true,
      },
    });
  }

  /**
   * Crea múltiples permisos de una vez
   */
  async createMany(permissions: CreatePermissionDto[]) {
    const results = [];

    for (const permission of permissions) {
      try {
        const created = await this.create(permission);
        results.push({ success: true, permission: created });
      } catch (error) {
        results.push({
          success: false,
          name: permission.name,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return results;
  }

  /**
   * Actualiza un permiso
   */
  async update(id: string, updatePermissionDto: UpdatePermissionDto) {
    await this.findOne(id);

    // Verificar si el nuevo nombre ya existe
    if (updatePermissionDto.name) {
      const existingPermission = await this.prisma.permission.findFirst({
        where: {
          name: updatePermissionDto.name,
          NOT: { id },
        },
      });

      if (existingPermission) {
        throw new BadRequestException('Permission name already in use');
      }
    }

    return this.prisma.permission.update({
      where: { id },
      data: updatePermissionDto,
      select: {
        id: true,
        name: true,
        description: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  /**
   * Elimina un permiso
   */
  async remove(id: string) {
    const permission = await this.findOne(id);

    // Verificar si el permiso está asignado a algún rol
    if (permission.roles.length > 0) {
      throw new BadRequestException(
        'Cannot delete permission assigned to roles. Remove from roles first.',
      );
    }

    await this.prisma.permission.delete({
      where: { id },
    });

    return { message: `Permission "${permission.name}" deleted successfully` };
  }
}
