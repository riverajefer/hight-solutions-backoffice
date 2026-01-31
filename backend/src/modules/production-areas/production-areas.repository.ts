import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { Prisma } from '../../generated/prisma';

@Injectable()
export class ProductionAreasRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Encuentra todas las áreas de producción
   */
  async findAll(includeInactive = false) {
    return this.prisma.productionArea.findMany({
      where: includeInactive ? {} : { isActive: true },
      select: {
        id: true,
        name: true,
        description: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { name: 'asc' },
    });
  }

  /**
   * Encuentra un área de producción por ID
   */
  async findById(id: string) {
    return this.prisma.productionArea.findUnique({
      where: { id },
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
   * Encuentra un área de producción por nombre
   */
  async findByName(name: string) {
    return this.prisma.productionArea.findUnique({
      where: { name },
    });
  }

  /**
   * Encuentra un área de producción por nombre excluyendo un ID específico
   */
  async findByNameExcludingId(name: string, excludeId: string) {
    return this.prisma.productionArea.findFirst({
      where: {
        name,
        NOT: { id: excludeId },
      },
    });
  }

  /**
   * Crea una nueva área de producción
   */
  async create(data: Prisma.ProductionAreaCreateInput) {
    return this.prisma.productionArea.create({
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
   * Actualiza un área de producción
   */
  async update(id: string, data: Prisma.ProductionAreaUpdateInput) {
    return this.prisma.productionArea.update({
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
   * Elimina un área de producción (hard delete)
   */
  async delete(id: string) {
    return this.prisma.productionArea.delete({
      where: { id },
    });
  }
}
