import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { Prisma, OrderStatus } from '../../generated/prisma';

@Injectable()
export class OrdersRepository {
  constructor(private readonly prisma: PrismaService) {}

  private readonly selectFields = {
    id: true,
    orderNumber: true,
    orderDate: true,
    deliveryDate: true,
    subtotal: true,
    taxRate: true,
    tax: true,
    total: true,
    paidAmount: true,
    balance: true,
    status: true,
    notes: true,
    createdAt: true,
    updatedAt: true,
    client: {
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
      },
    },
    createdBy: {
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
      },
    },
    items: {
      select: {
        id: true,
        description: true,
        quantity: true,
        unitPrice: true,
        total: true,
        specifications: true,
        sortOrder: true,
        service: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
      orderBy: { sortOrder: 'asc' as const },
    },
  };

  async findAll(status?: OrderStatus) {
    const where: Prisma.OrderWhereInput = status ? { status } : {};

    return this.prisma.order.findMany({
      where,
      select: this.selectFields,
      orderBy: { orderDate: 'desc' },
    });
  }

  async findById(id: string) {
    return this.prisma.order.findUnique({
      where: { id },
      select: this.selectFields,
    });
  }

  async findByOrderNumber(orderNumber: string) {
    return this.prisma.order.findUnique({
      where: { orderNumber },
      select: this.selectFields,
    });
  }

  async create(data: Prisma.OrderCreateInput) {
    return this.prisma.order.create({
      data,
      select: this.selectFields,
    });
  }

  async update(id: string, data: Prisma.OrderUpdateInput) {
    return this.prisma.order.update({
      where: { id },
      data,
      select: this.selectFields,
    });
  }

  async delete(id: string) {
    return this.prisma.order.delete({
      where: { id },
    });
  }

  async updateStatus(id: string, status: OrderStatus) {
    return this.prisma.order.update({
      where: { id },
      data: { status },
      select: this.selectFields,
    });
  }

  // Para cálculos de totales por cliente
  async getTotalsByClient(clientId: string) {
    return this.prisma.order.aggregate({
      where: { clientId },
      _sum: {
        total: true,
        paidAmount: true,
        balance: true,
      },
      _count: true,
    });
  }
}
