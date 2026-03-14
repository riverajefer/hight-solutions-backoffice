import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { Prisma } from '../../generated/prisma';

@Injectable()
export class SuppliersRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Find all suppliers with department and city info
   */
  async findAll(includeInactive = false) {
    return this.prisma.supplier.findMany({
      where: includeInactive ? {} : { isActive: true },
      select: {
        id: true,
        name: true,
        encargado: true,
        phone: true,
        landlinePhone: true,
        address: true,
        email: true,
        departmentId: true,
        cityId: true,
        personType: true,
        nit: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        department: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        city: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  /**
   * Find supplier by ID
   */
  async findById(id: string) {
    return this.prisma.supplier.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        phone: true,
        address: true,
        email: true,
        departmentId: true,
        cityId: true,
        personType: true,
        nit: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        encargado: true,
        landlinePhone: true,
        department: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        city: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  }

  /**
   * Find supplier by email (for uniqueness validation)
   */
  async findByEmail(email: string) {
    return this.prisma.supplier.findUnique({
      where: { email },
    });
  }

  /**
   * Find supplier by email excluding a specific ID (for update validation)
   */
  async findByEmailExcludingId(email: string, excludeId: string) {
    return this.prisma.supplier.findFirst({
      where: {
        email,
        NOT: { id: excludeId },
      },
    });
  }

  /**
   * Create a new supplier
   */
  async create(data: Prisma.SupplierCreateInput) {
    return this.prisma.supplier.create({
      data,
      select: {
        id: true,
        name: true,
        phone: true,
        address: true,
        email: true,
        departmentId: true,
        cityId: true,
        personType: true,
        nit: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        department: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        city: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  }

  /**
   * Update a supplier
   */
  async update(id: string, data: Prisma.SupplierUpdateInput) {
    return this.prisma.supplier.update({
      where: { id },
      data,
      select: {
        id: true,
        name: true,
        phone: true,
        address: true,
        email: true,
        departmentId: true,
        cityId: true,
        personType: true,
        nit: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        department: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        city: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  }

  /**
   * Hard delete a supplier (use soft delete in service instead)
   */
  async delete(id: string) {
    return this.prisma.supplier.delete({
      where: { id },
    });
  }
}
