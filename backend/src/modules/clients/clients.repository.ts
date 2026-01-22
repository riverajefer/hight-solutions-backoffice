import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { Prisma } from '../../generated/prisma';

@Injectable()
export class ClientsRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Find all clients with department and city info
   */
  async findAll(includeInactive = false) {
    return this.prisma.client.findMany({
      where: includeInactive ? {} : { isActive: true },
      select: {
        id: true,
        name: true,
        manager: true,
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
      orderBy: { name: 'asc' },
    });
  }

  /**
   * Find client by ID
   */
  async findById(id: string) {
    return this.prisma.client.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        manager: true,
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
   * Find client by email (for uniqueness validation)
   */
  async findByEmail(email: string) {
    return this.prisma.client.findUnique({
      where: { email },
    });
  }

  /**
   * Find client by email excluding a specific ID (for update validation)
   */
  async findByEmailExcludingId(email: string, excludeId: string) {
    return this.prisma.client.findFirst({
      where: {
        email,
        NOT: { id: excludeId },
      },
    });
  }

  /**
   * Create a new client
   */
  async create(data: Prisma.ClientCreateInput) {
    return this.prisma.client.create({
      data,
      select: {
        id: true,
        name: true,
        manager: true,
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
   * Update a client
   */
  async update(id: string, data: Prisma.ClientUpdateInput) {
    return this.prisma.client.update({
      where: { id },
      data,
      select: {
        id: true,
        name: true,
        manager: true,
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
   * Hard delete a client (use soft delete in service instead)
   */
  async delete(id: string) {
    return this.prisma.client.delete({
      where: { id },
    });
  }
}
