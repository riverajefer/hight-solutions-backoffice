import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { Prisma } from '../../generated/prisma';

@Injectable()
export class CargosRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Encuentra todos los cargos activos con información del área
   */
  async findAll(includeInactive = false) {
    return this.prisma.cargo.findMany({
      where: includeInactive ? {} : { isActive: true },
      select: {
        id: true,
        name: true,
        description: true,
        isActive: true,
        areaId: true,
        createdAt: true,
        updatedAt: true,
        area: {
          select: {
            id: true,
            name: true,
            isActive: true,
          },
        },
        _count: {
          select: {
            users: true,
          },
        },
      },
      orderBy: [{ area: { name: 'asc' } }, { name: 'asc' }],
    });
  }

  /**
   * Encuentra cargos por área
   */
  async findByArea(areaId: string, includeInactive = false) {
    return this.prisma.cargo.findMany({
      where: {
        areaId,
        ...(includeInactive ? {} : { isActive: true }),
      },
      select: {
        id: true,
        name: true,
        description: true,
        isActive: true,
        areaId: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            users: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  /**
   * Encuentra un cargo por ID con área y conteo de usuarios
   */
  async findById(id: string) {
    return this.prisma.cargo.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        description: true,
        isActive: true,
        areaId: true,
        createdAt: true,
        updatedAt: true,
        area: {
          select: {
            id: true,
            name: true,
            isActive: true,
          },
        },
        _count: {
          select: {
            users: true,
          },
        },
      },
    });
  }

  /**
   * Encuentra un cargo por nombre y área
   */
  async findByNameAndArea(name: string, areaId: string) {
    return this.prisma.cargo.findUnique({
      where: {
        name_areaId: { name, areaId },
      },
    });
  }

  /**
   * Encuentra un cargo por nombre y área excluyendo un ID específico
   */
  async findByNameAndAreaExcludingId(
    name: string,
    areaId: string,
    excludeId: string,
  ) {
    return this.prisma.cargo.findFirst({
      where: {
        name,
        areaId,
        NOT: { id: excludeId },
      },
    });
  }

  /**
   * Crea un nuevo cargo
   */
  async create(data: Prisma.CargoCreateInput) {
    return this.prisma.cargo.create({
      data,
      select: {
        id: true,
        name: true,
        description: true,
        isActive: true,
        areaId: true,
        createdAt: true,
        updatedAt: true,
        area: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  }

  /**
   * Actualiza un cargo
   */
  async update(id: string, data: Prisma.CargoUpdateInput) {
    return this.prisma.cargo.update({
      where: { id },
      data,
      select: {
        id: true,
        name: true,
        description: true,
        isActive: true,
        areaId: true,
        createdAt: true,
        updatedAt: true,
        area: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  }

  /**
   * Cuenta los usuarios asignados a un cargo
   */
  async countUsers(cargoId: string) {
    return this.prisma.user.count({
      where: { cargoId },
    });
  }

  /**
   * Elimina un cargo (hard delete)
   */
  async delete(id: string) {
    return this.prisma.cargo.delete({
      where: { id },
    });
  }
}
