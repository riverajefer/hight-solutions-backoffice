import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { OrdersRepository } from './orders.repository';
import { ConsecutivesService } from '../consecutives/consecutives.service';
import {
  CreateOrderDto,
  UpdateOrderDto,
  FilterOrdersDto,
  AddOrderItemDto,
  UpdateOrderItemDto,
  CreatePaymentDto,
} from './dto';
import { OrderStatus, Prisma } from '../../generated/prisma';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class OrdersService {
  constructor(
    private readonly ordersRepository: OrdersRepository,
    private readonly consecutivesService: ConsecutivesService,
    private readonly prisma: PrismaService,
  ) {}

  async findAll(filters: FilterOrdersDto) {
    const { status, clientId, orderDateFrom, orderDateTo, page, limit } = filters;

    return this.ordersRepository.findAllWithFilters({
      status,
      clientId,
      orderDateFrom: orderDateFrom ? new Date(orderDateFrom) : undefined,
      orderDateTo: orderDateTo ? new Date(orderDateTo) : undefined,
      page,
      limit,
    });
  }

  async findOne(id: string) {
    const order = await this.ordersRepository.findById(id);
    if (!order) {
      throw new NotFoundException(`Order with ID ${id} not found`);
    }
    return order;
  }

  async create(createOrderDto: CreateOrderDto, createdById: string) {
    // Validar que tenga items
    if (!createOrderDto.items || createOrderDto.items.length === 0) {
      throw new BadRequestException('Order must have at least one item');
    }

    // Generar número de orden
    const orderNumber = await this.consecutivesService.generateNumber('ORDER');

    // Calcular totales
    let subtotal = new Prisma.Decimal(0);

    const items = createOrderDto.items.map((item, index) => {
      const itemTotal = new Prisma.Decimal(item.quantity).mul(item.unitPrice);
      subtotal = subtotal.add(itemTotal);

      return {
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        total: itemTotal,
        specifications: item.specifications || undefined,
        sortOrder: index + 1,
        ...(item.serviceId && {
          service: { connect: { id: item.serviceId } },
        }),
      };
    });

    const taxRate = new Prisma.Decimal(0.19);
    const tax = subtotal.mul(taxRate);
    const total = subtotal.add(tax);

    // Manejar pago inicial
    let paidAmount = new Prisma.Decimal(0);
    let payments = undefined;

    if (createOrderDto.initialPayment) {
      paidAmount = new Prisma.Decimal(createOrderDto.initialPayment.amount);

      // Validar que el pago inicial no exceda el total
      if (paidAmount.greaterThan(total)) {
        throw new BadRequestException('Initial payment cannot exceed order total');
      }

      payments = {
        create: [
          {
            amount: paidAmount,
            paymentMethod: createOrderDto.initialPayment.paymentMethod,
            paymentDate: new Date(),
            reference: createOrderDto.initialPayment.reference,
            notes: createOrderDto.initialPayment.notes,
            receivedBy: { connect: { id: createdById } },
          },
        ],
      };
    }

    const balance = total.sub(paidAmount);

    // Crear orden con items y pago inicial (en transacción)
    return this.ordersRepository.create({
      orderNumber,
      orderDate: new Date(),
      deliveryDate: createOrderDto.deliveryDate
        ? new Date(createOrderDto.deliveryDate)
        : undefined,
      subtotal,
      taxRate,
      tax,
      total,
      paidAmount,
      balance,
      notes: createOrderDto.notes,
      client: { connect: { id: createOrderDto.clientId } },
      createdBy: { connect: { id: createdById } },
      items: {
        create: items,
      },
      ...(payments && { payments }),
    });
  }

  async update(id: string, updateOrderDto: UpdateOrderDto) {
    const order = await this.findOne(id);

    // Solo se pueden editar órdenes en estado DRAFT
    if (order.status !== OrderStatus.DRAFT) {
      throw new BadRequestException(
        'Only DRAFT orders can be updated. Use status endpoint to change order state.',
      );
    }

    return this.ordersRepository.update(id, {
      ...(updateOrderDto.clientId && {
        client: { connect: { id: updateOrderDto.clientId } },
      }),
      ...(updateOrderDto.deliveryDate && {
        deliveryDate: new Date(updateOrderDto.deliveryDate),
      }),
      ...(updateOrderDto.notes !== undefined && {
        notes: updateOrderDto.notes,
      }),
    });
  }

  async updateStatus(id: string, status: OrderStatus) {
    await this.findOne(id);
    return this.ordersRepository.updateStatus(id, status);
  }

  async remove(id: string) {
    const order = await this.findOne(id);

    // Solo se pueden eliminar borradores o canceladas
    const allowedStatuses: OrderStatus[] = [OrderStatus.DRAFT, OrderStatus.CANCELLED];
    if (!allowedStatuses.includes(order.status)) {
      throw new BadRequestException(
        'Only DRAFT or CANCELLED orders can be deleted',
      );
    }

    await this.ordersRepository.delete(id);
    return { message: 'Order deleted successfully' };
  }

  // ========== ITEM MANAGEMENT ==========

  async addItem(orderId: string, addItemDto: AddOrderItemDto) {
    const order = await this.findOne(orderId);

    // Solo se pueden agregar items a órdenes en DRAFT
    if (order.status !== OrderStatus.DRAFT) {
      throw new BadRequestException('Items can only be added to DRAFT orders');
    }

    // Usar transacción para crear item y recalcular totales
    return this.prisma.$transaction(async (tx) => {
      // Calcular total del item
      const itemTotal = new Prisma.Decimal(addItemDto.quantity).mul(
        addItemDto.unitPrice,
      );

      // Obtener el último sortOrder
      const lastItem = await tx.orderItem.findFirst({
        where: { orderId },
        orderBy: { sortOrder: 'desc' },
        select: { sortOrder: true },
      });

      const sortOrder = lastItem ? lastItem.sortOrder + 1 : 1;

      // Crear el item
      await tx.orderItem.create({
        data: {
          orderId,
          description: addItemDto.description,
          quantity: addItemDto.quantity,
          unitPrice: addItemDto.unitPrice,
          total: itemTotal,
          specifications: addItemDto.specifications,
          sortOrder,
          ...(addItemDto.serviceId && {
            serviceId: addItemDto.serviceId,
          }),
        },
      });

      // Recalcular totales
      return this.recalculateOrderTotals(orderId, tx);
    });
  }

  async updateItem(
    orderId: string,
    itemId: string,
    updateItemDto: UpdateOrderItemDto,
  ) {
    const order = await this.findOne(orderId);

    // Solo se pueden modificar items en órdenes DRAFT
    if (order.status !== OrderStatus.DRAFT) {
      throw new BadRequestException('Items can only be modified in DRAFT orders');
    }

    // Verificar que el item pertenezca a la orden
    const item = await this.ordersRepository.findItemById(itemId);
    if (!item || item.orderId !== orderId) {
      throw new NotFoundException('Item not found in this order');
    }

    // Usar transacción para actualizar item y recalcular totales
    return this.prisma.$transaction(async (tx) => {
      // Preparar datos de actualización
      const updateData: any = {};

      if (updateItemDto.description !== undefined) {
        updateData.description = updateItemDto.description;
      }

      if (updateItemDto.quantity !== undefined) {
        updateData.quantity = updateItemDto.quantity;
      }

      if (updateItemDto.unitPrice !== undefined) {
        updateData.unitPrice = updateItemDto.unitPrice;
      }

      if (updateItemDto.specifications !== undefined) {
        updateData.specifications = updateItemDto.specifications;
      }

      if (updateItemDto.serviceId !== undefined) {
        updateData.serviceId = updateItemDto.serviceId;
      }

      // Recalcular total del item si cambió cantidad o precio
      if (updateData.quantity !== undefined || updateData.unitPrice !== undefined) {
        const quantity = new Prisma.Decimal(
          updateData.quantity ?? item.quantity,
        );
        const unitPrice = new Prisma.Decimal(
          updateData.unitPrice ?? item.unitPrice,
        );
        updateData.total = quantity.mul(unitPrice);
      }

      // Actualizar el item
      await tx.orderItem.update({
        where: { id: itemId },
        data: updateData,
      });

      // Recalcular totales de la orden
      return this.recalculateOrderTotals(orderId, tx);
    });
  }

  async removeItem(orderId: string, itemId: string) {
    const order = await this.findOne(orderId);

    // Solo se pueden eliminar items de órdenes DRAFT
    if (order.status !== OrderStatus.DRAFT) {
      throw new BadRequestException('Items can only be removed from DRAFT orders');
    }

    // Verificar que el item pertenezca a la orden
    const item = await this.ordersRepository.findItemById(itemId);
    if (!item || item.orderId !== orderId) {
      throw new NotFoundException('Item not found in this order');
    }

    // Verificar que quede al menos 1 item
    if (order.items.length <= 1) {
      throw new BadRequestException('Order must have at least one item');
    }

    // Usar transacción para eliminar item y recalcular totales
    return this.prisma.$transaction(async (tx) => {
      // Eliminar el item
      await tx.orderItem.delete({
        where: { id: itemId },
      });

      // Recalcular totales
      return this.recalculateOrderTotals(orderId, tx);
    });
  }

  // ========== PAYMENT MANAGEMENT ==========

  async addPayment(
    orderId: string,
    createPaymentDto: CreatePaymentDto,
    receivedById: string,
  ) {
    const order = await this.findOne(orderId);

    // Solo se pueden agregar pagos a órdenes CONFIRMED en adelante
    const allowedStatuses: OrderStatus[] = [
      OrderStatus.CONFIRMED,
      OrderStatus.IN_PRODUCTION,
      OrderStatus.READY,
      OrderStatus.DELIVERED,
    ];

    if (!allowedStatuses.includes(order.status)) {
      throw new BadRequestException(
        'Payments can only be added to CONFIRMED or later status orders',
      );
    }

    const paymentAmount = new Prisma.Decimal(createPaymentDto.amount);

    // Validar que el pago no exceda el saldo pendiente
    if (paymentAmount.greaterThan(order.balance)) {
      throw new BadRequestException(
        `Payment amount (${paymentAmount}) cannot exceed order balance (${order.balance})`,
      );
    }

    // Usar transacción para crear pago y actualizar totales
    return this.prisma.$transaction(async (tx) => {
      // Crear el pago
      const payment = await tx.payment.create({
        data: {
          orderId,
          amount: paymentAmount,
          paymentMethod: createPaymentDto.paymentMethod,
          paymentDate: createPaymentDto.paymentDate
            ? new Date(createPaymentDto.paymentDate)
            : new Date(),
          reference: createPaymentDto.reference,
          notes: createPaymentDto.notes,
          receivedById,
        },
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

      // Actualizar paidAmount y balance
      const newPaidAmount = new Prisma.Decimal(order.paidAmount).add(
        paymentAmount,
      );
      const newBalance = new Prisma.Decimal(order.total).sub(newPaidAmount);

      await tx.order.update({
        where: { id: orderId },
        data: {
          paidAmount: newPaidAmount,
          balance: newBalance,
        },
      });

      return payment;
    });
  }

  async getPayments(orderId: string) {
    // Verificar que la orden existe
    await this.findOne(orderId);

    return this.ordersRepository.findPaymentsByOrderId(orderId);
  }

  // ========== PRIVATE HELPERS ==========

  /**
   * Recalcula los totales de una orden basándose en sus items actuales
   * Debe ejecutarse dentro de una transacción
   */
  private async recalculateOrderTotals(
    orderId: string,
    tx: Prisma.TransactionClient,
  ) {
    // Obtener todos los items de la orden
    const items = await tx.orderItem.findMany({
      where: { orderId },
    });

    // Calcular subtotal
    let subtotal = new Prisma.Decimal(0);
    for (const item of items) {
      subtotal = subtotal.add(item.total);
    }

    // Calcular impuesto y total
    const taxRate = new Prisma.Decimal(0.19);
    const tax = subtotal.mul(taxRate);
    const total = subtotal.add(tax);

    // Obtener paidAmount actual
    const order = await tx.order.findUnique({
      where: { id: orderId },
      select: { paidAmount: true },
    });

    const paidAmount = order?.paidAmount || new Prisma.Decimal(0);
    const balance = total.sub(paidAmount);

    // Actualizar orden
    return tx.order.update({
      where: { id: orderId },
      data: {
        subtotal,
        tax,
        total,
        balance,
      },
      select: {
        id: true,
        orderNumber: true,
        subtotal: true,
        tax: true,
        total: true,
        paidAmount: true,
        balance: true,
      },
    });
  }
}
