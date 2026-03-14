import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { Prisma } from '../../../generated/prisma';

@Injectable()
export class ProductCategoriesRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Encuentra todas las categorías de productos
   */
  async findAll(includeInactive = false) {
    return this.prisma.productCategory.findMany({
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
   * Encuentra una categoría de producto por ID
   */
  async findById(id: string) {
    return this.prisma.productCategory.findUnique({
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
    return this.prisma.productCategory.findUnique({
      where: { name },
    });
  }

  /**
   * Encuentra por nombre excluyendo un ID
   */
  async findByNameExcludingId(name: string, excludeId: string) {
    return this.prisma.productCategory.findFirst({
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
    return this.prisma.productCategory.findUnique({
      where: { slug },
    });
  }

  /**
   * Encuentra por slug excluyendo un ID
   */
  async findBySlugExcludingId(slug: string, excludeId: string) {
    return this.prisma.productCategory.findFirst({
      where: {
        slug,
        NOT: { id: excludeId },
      },
    });
  }

  /**
   * Crea una nueva categoría de producto
   */
  async create(data: Prisma.ProductCategoryCreateInput) {
    return this.prisma.productCategory.create({
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
   * Actualiza una categoría de producto
   */
  async update(id: string, data: Prisma.ProductCategoryUpdateInput) {
    return this.prisma.productCategory.update({
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
   * Elimina una categoría de producto (hard delete)
   */
  async delete(id: string) {
    return this.prisma.productCategory.delete({
      where: { id },
    });
  }
}
