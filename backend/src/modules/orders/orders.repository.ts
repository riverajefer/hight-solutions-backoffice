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
    commercialChannelId: true,
    commercialChannel: {
      select: {
        id: true,
        name: true,
      },
    },
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
    payments: {
      select: {
        id: true,
        amount: true,
        paymentMethod: true,
        paymentDate: true,
        reference: true,
        notes: true,
        createdAt: true,
        receivedBy: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: { paymentDate: 'desc' as const },
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

  async findAllWithFilters(filters: {
    status?: OrderStatus;
    clientId?: string;
    orderDateFrom?: Date;
    orderDateTo?: Date;
    page?: number;
    limit?: number;
  }) {
    const { status, clientId, orderDateFrom, orderDateTo, page = 1, limit = 20 } = filters;

    const where: Prisma.OrderWhereInput = {};

    if (status) {
      where.status = status;
    }

    if (clientId) {
      where.clientId = clientId;
    }

    if (orderDateFrom || orderDateTo) {
      where.orderDate = {};
      if (orderDateFrom) {
        where.orderDate.gte = orderDateFrom;
      }
      if (orderDateTo) {
        where.orderDate.lte = orderDateTo;
      }
    }

    const skip = (page - 1) * limit;

    const [orders, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        select: this.selectFields,
        orderBy: { orderDate: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.order.count({ where }),
    ]);

    return {
      data: orders,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
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
    // Crear la orden primero sin los includes complejos para mejor performance
    const order = await this.prisma.order.create({
      data,
      select: {
        id: true,
        orderNumber: true,
        status: true,
      },
    });

    // Luego obtener la orden completa con todos los datos
    return this.findById(order.id);
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

  // ========== ITEM MANAGEMENT ==========

  async findItemById(itemId: string) {
    return this.prisma.orderItem.findUnique({
      where: { id: itemId },
      include: {
        order: {
          select: {
            id: true,
            status: true,
          },
        },
      },
    });
  }

  async createItem(data: Prisma.OrderItemCreateInput) {
    return this.prisma.orderItem.create({
      data,
    });
  }

  async updateItem(itemId: string, data: Prisma.OrderItemUpdateInput) {
    return this.prisma.orderItem.update({
      where: { id: itemId },
      data,
    });
  }

  async deleteItem(itemId: string) {
    return this.prisma.orderItem.delete({
      where: { id: itemId },
    });
  }

  // ========== PAYMENT MANAGEMENT ==========

  async createPayment(data: Prisma.PaymentCreateInput) {
    return this.prisma.payment.create({
      data,
      select: {
        id: true,
        amount: true,
        paymentMethod: true,
        paymentDate: true,
        reference: true,
        notes: true,
        createdAt: true,
        receivedBy: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });
  }

  async findPaymentsByOrderId(orderId: string) {
    return this.prisma.payment.findMany({
      where: { orderId },
      select: {
        id: true,
        amount: true,
        paymentMethod: true,
        paymentDate: true,
        reference: true,
        notes: true,
        createdAt: true,
        receivedBy: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: { paymentDate: 'desc' },
    });
  }

  // ========== ORDER FINANCIALS UPDATE ==========

  async updateOrderFinancials(
    orderId: string,
    financials: {
      subtotal: Prisma.Decimal;
      tax: Prisma.Decimal;
      total: Prisma.Decimal;
      paidAmount: Prisma.Decimal;
      balance: Prisma.Decimal;
    },
  ) {
    return this.prisma.order.update({
      where: { id: orderId },
      data: financials,
      select: this.selectFields,
    });
  }
}
