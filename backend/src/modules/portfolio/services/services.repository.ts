import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { Prisma } from '../../../generated/prisma';

@Injectable()
export class ServicesRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Encuentra todos los servicios
   */
  async findAll(includeInactive = false, categoryId?: string) {
    return this.prisma.service.findMany({
      where: {
        ...(includeInactive ? {} : { isActive: true }),
        ...(categoryId ? { categoryId } : {}),
      },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
            icon: true,
          },
        },
      },
      orderBy: [{ name: 'asc' }],
    });
  }

  /**
   * Encuentra un servicio por ID
   */
  async findById(id: string) {
    return this.prisma.service.findUnique({
      where: { id },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
            icon: true,
          },
        },
      },
    });
  }

  /**
   * Encuentra por slug
   */
  async findBySlug(slug: string) {
    return this.prisma.service.findUnique({
      where: { slug },
    });
  }

  /**
   * Encuentra por slug excluyendo un ID
   */
  async findBySlugExcludingId(slug: string, excludeId: string) {
    return this.prisma.service.findFirst({
      where: {
        slug,
        NOT: { id: excludeId },
      },
    });
  }

  /**
   * Encuentra por nombre y categoría
   */
  async findByNameAndCategory(name: string, categoryId: string) {
    return this.prisma.service.findFirst({
      where: {
        name,
        categoryId,
      },
    });
  }

  /**
   * Encuentra por nombre y categoría excluyendo un ID
   */
  async findByNameAndCategoryExcludingId(
    name: string,
    categoryId: string,
    excludeId: string,
  ) {
    return this.prisma.service.findFirst({
      where: {
        name,
        categoryId,
        NOT: { id: excludeId },
      },
    });
  }

  /**
   * Crea un nuevo servicio
   */
  async create(data: Prisma.ServiceCreateInput) {
    return this.prisma.service.create({
      data,
      include: {
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
            icon: true,
          },
        },
      },
    });
  }

  /**
   * Actualiza un servicio
   */
  async update(id: string, data: Prisma.ServiceUpdateInput) {
    return this.prisma.service.update({
      where: { id },
      data,
      include: {
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
            icon: true,
          },
        },
      },
    });
  }

  /**
   * Elimina un servicio (hard delete)
   */
  async delete(id: string) {
    return this.prisma.service.delete({
      where: { id },
    });
  }
}
