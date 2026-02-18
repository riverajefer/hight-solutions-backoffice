import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { Prisma } from '../../../generated/prisma';

@Injectable()
export class ProductsRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Encuentra todos los productos
   */
  async findAll(includeInactive = false, categoryId?: string) {
    return this.prisma.product.findMany({
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
   * Encuentra un producto por ID
   */
  async findById(id: string) {
    return this.prisma.product.findUnique({
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
    return this.prisma.product.findUnique({
      where: { slug },
    });
  }

  /**
   * Encuentra por slug excluyendo un ID
   */
  async findBySlugExcludingId(slug: string, excludeId: string) {
    return this.prisma.product.findFirst({
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
    return this.prisma.product.findFirst({
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
    return this.prisma.product.findFirst({
      where: {
        name,
        categoryId,
        NOT: { id: excludeId },
      },
    });
  }

  /**
   * Crea un nuevo producto
   */
  async create(data: Prisma.ProductCreateInput) {
    return this.prisma.product.create({
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
   * Actualiza un producto
   */
  async update(id: string, data: Prisma.ProductUpdateInput) {
    return this.prisma.product.update({
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
   * Elimina un producto (hard delete)
   */
  async delete(id: string) {
    return this.prisma.product.delete({
      where: { id },
    });
  }
}
