import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { Prisma } from '../../../generated/prisma';

@Injectable()
export class SuppliesRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Encuentra todos los insumos
   */
  async findAll(includeInactive = false, categoryId?: string) {
    return this.prisma.supply.findMany({
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
        purchaseUnit: {
          select: {
            id: true,
            name: true,
            abbreviation: true,
          },
        },
        consumptionUnit: {
          select: {
            id: true,
            name: true,
            abbreviation: true,
          },
        },
      },
      orderBy: [{ name: 'asc' }],
    });
  }

  /**
   * Encuentra un insumo por ID
   */
  async findById(id: string) {
    return this.prisma.supply.findUnique({
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
        purchaseUnit: {
          select: {
            id: true,
            name: true,
            abbreviation: true,
          },
        },
        consumptionUnit: {
          select: {
            id: true,
            name: true,
            abbreviation: true,
          },
        },
      },
    });
  }

  /**
   * Encuentra por SKU
   */
  async findBySku(sku: string) {
    return this.prisma.supply.findUnique({
      where: { sku },
    });
  }

  /**
   * Encuentra por SKU excluyendo un ID
   */
  async findBySkuExcludingId(sku: string, excludeId: string) {
    return this.prisma.supply.findFirst({
      where: {
        sku,
        NOT: { id: excludeId },
      },
    });
  }

  /**
   * Encuentra por nombre y categoría
   */
  async findByNameAndCategory(name: string, categoryId: string) {
    return this.prisma.supply.findFirst({
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
    return this.prisma.supply.findFirst({
      where: {
        name,
        categoryId,
        NOT: { id: excludeId },
      },
    });
  }

  /**
   * Crea un nuevo insumo
   */
  async create(data: Prisma.SupplyCreateInput) {
    return this.prisma.supply.create({
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
        purchaseUnit: {
          select: {
            id: true,
            name: true,
            abbreviation: true,
          },
        },
        consumptionUnit: {
          select: {
            id: true,
            name: true,
            abbreviation: true,
          },
        },
      },
    });
  }

  /**
   * Actualiza un insumo
   */
  async update(id: string, data: Prisma.SupplyUpdateInput) {
    return this.prisma.supply.update({
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
        purchaseUnit: {
          select: {
            id: true,
            name: true,
            abbreviation: true,
          },
        },
        consumptionUnit: {
          select: {
            id: true,
            name: true,
            abbreviation: true,
          },
        },
      },
    });
  }

  /**
   * Elimina un insumo (hard delete)
   */
  async delete(id: string) {
    return this.prisma.supply.delete({
      where: { id },
    });
  }

  /**
   * Encuentra insumos con stock bajo (stock actual < stock mínimo)
   */
  async findLowStock() {
    return this.prisma.$queryRaw`
      SELECT * FROM supplies
      WHERE is_active = 1
      AND current_stock < minimum_stock
      ORDER BY name ASC
    `;
  }
}
