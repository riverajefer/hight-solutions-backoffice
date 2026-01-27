import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { Prisma } from '../../../generated/prisma';

@Injectable()
export class SupplyCategoriesRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Encuentra todas las categorías de insumos
   */
  async findAll(includeInactive = false) {
    return this.prisma.supplyCategory.findMany({
      where: includeInactive ? {} : { isActive: true },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        icon: true,
        sortOrder: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
  }

  /**
   * Encuentra una categoría de insumo por ID
   */
  async findById(id: string) {
    return this.prisma.supplyCategory.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        icon: true,
        sortOrder: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  /**
   * Encuentra por nombre
   */
  async findByName(name: string) {
    return this.prisma.supplyCategory.findUnique({
      where: { name },
    });
  }

  /**
   * Encuentra por nombre excluyendo un ID
   */
  async findByNameExcludingId(name: string, excludeId: string) {
    return this.prisma.supplyCategory.findFirst({
      where: {
        name,
        NOT: { id: excludeId },
      },
    });
  }

  /**
   * Encuentra por slug
   */
  async findBySlug(slug: string) {
    return this.prisma.supplyCategory.findUnique({
      where: { slug },
    });
  }

  /**
   * Encuentra por slug excluyendo un ID
   */
  async findBySlugExcludingId(slug: string, excludeId: string) {
    return this.prisma.supplyCategory.findFirst({
      where: {
        slug,
        NOT: { id: excludeId },
      },
    });
  }

  /**
   * Crea una nueva categoría de insumo
   */
  async create(data: Prisma.SupplyCategoryCreateInput) {
    return this.prisma.supplyCategory.create({
      data,
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        icon: true,
        sortOrder: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  /**
   * Actualiza una categoría de insumo
   */
  async update(id: string, data: Prisma.SupplyCategoryUpdateInput) {
    return this.prisma.supplyCategory.update({
      where: { id },
      data,
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        icon: true,
        sortOrder: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  /**
   * Elimina una categoría de insumo (hard delete)
   */
  async delete(id: string) {
    return this.prisma.supplyCategory.delete({
      where: { id },
    });
  }
}
