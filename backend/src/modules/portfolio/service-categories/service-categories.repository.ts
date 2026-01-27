import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { Prisma } from '../../../generated/prisma';

@Injectable()
export class ServiceCategoriesRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Encuentra todas las categorías de servicios
   */
  async findAll(includeInactive = false) {
    return this.prisma.serviceCategory.findMany({
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
   * Encuentra una categoría de servicio por ID
   */
  async findById(id: string) {
    return this.prisma.serviceCategory.findUnique({
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
    return this.prisma.serviceCategory.findUnique({
      where: { name },
    });
  }

  /**
   * Encuentra por nombre excluyendo un ID
   */
  async findByNameExcludingId(name: string, excludeId: string) {
    return this.prisma.serviceCategory.findFirst({
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
    return this.prisma.serviceCategory.findUnique({
      where: { slug },
    });
  }

  /**
   * Encuentra por slug excluyendo un ID
   */
  async findBySlugExcludingId(slug: string, excludeId: string) {
    return this.prisma.serviceCategory.findFirst({
      where: {
        slug,
        NOT: { id: excludeId },
      },
    });
  }

  /**
   * Crea una nueva categoría de servicio
   */
  async create(data: Prisma.ServiceCategoryCreateInput) {
    return this.prisma.serviceCategory.create({
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
   * Actualiza una categoría de servicio
   */
  async update(id: string, data: Prisma.ServiceCategoryUpdateInput) {
    return this.prisma.serviceCategory.update({
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
   * Elimina una categoría de servicio (hard delete)
   */
  async delete(id: string) {
    return this.prisma.serviceCategory.delete({
      where: { id },
    });
  }
}
