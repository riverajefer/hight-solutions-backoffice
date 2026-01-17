import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { CreatePermissionDto, UpdatePermissionDto } from './dto';
import { PermissionsRepository } from './permissions.repository';
@Injectable()
export class PermissionsService {
  constructor(
    private readonly permissionsRepository: PermissionsRepository,
  ) {}

  /**
   * Obtiene todos los permisos
   */
  async findAll() {
    return this.permissionsRepository.findAll();
  }

  /**
   * Obtiene todos los permisos con información adicional
   */
  async findAllWithDetails() {
    return this.permissionsRepository.findAll();
  }

  /**
   * Obtiene un permiso por ID
   */
  async findOne(id: string) {
    const permission = await this.permissionsRepository.findById(id);

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
    const existingPermission = await this.permissionsRepository.findByName(
      createPermissionDto.name,
    );

    if (existingPermission) {
      throw new BadRequestException('Permission name already exists');
    }

    return this.permissionsRepository.create(createPermissionDto);
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
      const existingPermission = await this.permissionsRepository.findByNameExcludingId(
        updatePermissionDto.name,
        id,
      );

      if (existingPermission) {
        throw new BadRequestException('Permission name already in use');
      }
    }

    return this.permissionsRepository.update(id, updatePermissionDto);
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

    await this.permissionsRepository.delete(id);

    return { message: `Permission "${permission.name}" deleted successfully` };
  }
}
