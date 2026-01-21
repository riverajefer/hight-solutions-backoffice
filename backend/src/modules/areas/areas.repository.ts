import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { Prisma } from '../../generated/prisma';

@Injectable()
export class AreasRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Encuentra todas las áreas activas con conteo de cargos
   */
  async findAll(includeInactive = false) {
    return this.prisma.area.findMany({
      where: includeInactive ? {} : { isActive: true },
      select: {
        id: true,
        name: true,
        description: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            cargos: {
              where: { isActive: true },
            },
          },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  /**
   * Encuentra un área por ID con sus cargos
   */
  async findById(id: string) {
    return this.prisma.area.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        description: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        cargos: {
          where: { isActive: true },
          select: {
            id: true,
            name: true,
            description: true,
            isActive: true,
            _count: {
              select: {
                users: true,
              },
            },
          },
          orderBy: { name: 'asc' },
        },
      },
    });
  }

  /**
   * Encuentra un área por nombre
   */
  async findByName(name: string) {
    return this.prisma.area.findUnique({
      where: { name },
    });
  }

  /**
   * Encuentra un área por nombre excluyendo un ID específico
   */
  async findByNameExcludingId(name: string, excludeId: string) {
    return this.prisma.area.findFirst({
      where: {
        name,
        NOT: { id: excludeId },
      },
    });
  }

  /**
   * Crea una nueva área
   */
  async create(data: Prisma.AreaCreateInput) {
    return this.prisma.area.create({
      data,
      select: {
        id: true,
        name: true,
        description: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  /**
   * Actualiza un área
   */
  async update(id: string, data: Prisma.AreaUpdateInput) {
    return this.prisma.area.update({
      where: { id },
      data,
      select: {
        id: true,
        name: true,
        description: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  /**
   * Cuenta los cargos activos de un área
   */
  async countActiveCargos(areaId: string) {
    return this.prisma.cargo.count({
      where: {
        areaId,
        isActive: true,
      },
    });
  }

  /**
   * Elimina un área (hard delete)
   */
  async delete(id: string) {
    return this.prisma.area.delete({
      where: { id },
    });
  }
}
