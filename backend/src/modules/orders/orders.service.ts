import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { OrdersRepository } from './orders.repository';
import { ConsecutivesService } from '../consecutives/consecutives.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { StorageService } from '../storage/storage.service';
import { OrderStatusChangeRequestsService } from '../order-status-change-requests/order-status-change-requests.service';
import {
  CreateOrderDto,
  UpdateOrderDto,
  FilterOrdersDto,
  AddOrderItemDto,
  UpdateOrderItemDto,
  CreatePaymentDto,
  ApplyDiscountDto,
} from './dto';
import { OrderStatus, Prisma } from '../../generated/prisma';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class OrdersService {
  constructor(
    private readonly ordersRepository: OrdersRepository,
    private readonly consecutivesService: ConsecutivesService,
    private readonly prisma: PrismaService,
    private readonly auditLogsService: AuditLogsService,
    private readonly storageService: StorageService,
    private readonly statusChangeRequestsService: OrderStatusChangeRequestsService,
  ) {}

  async findAll(filters: FilterOrdersDto) {
    const { status, search, clientId, orderDateFrom, orderDateTo, page, limit } = filters;

    return this.ordersRepository.findAllWithFilters({
      status,
      search,
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
        ...(item.productId && {
          product: { connect: { id: item.productId } },
        }),
        ...(item.productionAreaIds && item.productionAreaIds.length > 0 && {
          productionAreas: {
            create: item.productionAreaIds.map((areaId) => ({
              productionAreaId: areaId,
            })),
          },
        }),
      };
    });

    const taxRate = new Prisma.Decimal(0.19);
    const tax = subtotal.mul(taxRate);
    const discountAmount = new Prisma.Decimal(0);
    const total = subtotal.add(tax).sub(discountAmount);

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
    const newOrder = await this.ordersRepository.create({
      orderNumber,
      orderDate: new Date(),
      deliveryDate: createOrderDto.deliveryDate
        ? new Date(createOrderDto.deliveryDate)
        : undefined,
      subtotal,
      taxRate,
      tax,
      discountAmount,
      total,
      paidAmount,
      balance,
      notes: createOrderDto.notes,
      client: { connect: { id: createOrderDto.clientId } },
      createdBy: { connect: { id: createdById } },
      ...(createOrderDto.commercialChannelId && {
        commercialChannel: { connect: { id: createOrderDto.commercialChannelId } },
      }),
      items: {
        create: items,
      },
      ...(payments && { payments }),
    });

    // Registrar en audit log (fuera de la transacción, sin esperar para no afectar performance)
    if (newOrder) {
      this.auditLogsService.logOrderChange(
        'CREATE',
        newOrder.id,
        null,
        newOrder,
        createdById,
      );
    }

    return newOrder;
  }

  async update(id: string, updateOrderDto: UpdateOrderDto, userId: string) {
    const oldOrder = await this.findOne(id);

    // Validar cambio de fecha de entrega
    if (updateOrderDto.deliveryDate) {
      const newDeliveryDate = new Date(updateOrderDto.deliveryDate);
      const currentDeliveryDate = oldOrder.deliveryDate ? new Date(oldOrder.deliveryDate) : null;

      // Si hay una fecha anterior y la nueva es posterior (pospone), requiere razón
      if (currentDeliveryDate && newDeliveryDate > currentDeliveryDate) {
        if (!updateOrderDto.deliveryDateReason || updateOrderDto.deliveryDateReason.trim() === '') {
          throw new BadRequestException(
            'Debe proporcionar una razón para posponer la fecha de entrega'
          );
        }
      }
    }

    // Si viene items o initialPayment, usamos una transacción para actualizar todo el conjunto
    if (updateOrderDto.items || updateOrderDto.initialPayment) {
      const updatedOrder = await this.prisma.$transaction(async (tx) => {
        // Preparar datos de actualización de fecha
        const deliveryDateUpdateData: any = {};

        if (updateOrderDto.deliveryDate) {
          const newDeliveryDate = new Date(updateOrderDto.deliveryDate);
          const currentDeliveryDate = oldOrder.deliveryDate ? new Date(oldOrder.deliveryDate) : null;

          deliveryDateUpdateData.deliveryDate = newDeliveryDate;

          // Si la fecha cambió, registrar auditoría
          if (currentDeliveryDate && newDeliveryDate.getTime() !== currentDeliveryDate.getTime()) {
            deliveryDateUpdateData.previousDeliveryDate = currentDeliveryDate;
            deliveryDateUpdateData.deliveryDateChangedAt = new Date();
            deliveryDateUpdateData.deliveryDateChangedBy = userId;

            // Solo guardar razón si se pospone
            if (newDeliveryDate > currentDeliveryDate && updateOrderDto.deliveryDateReason) {
              deliveryDateUpdateData.deliveryDateReason = updateOrderDto.deliveryDateReason;
            }
          }
        }

        // 1. Actualizar datos básicos de la orden
        await tx.order.update({
          where: { id },
          data: {
            ...(updateOrderDto.clientId && {
              client: { connect: { id: updateOrderDto.clientId } },
            }),
            ...deliveryDateUpdateData,
            ...(updateOrderDto.notes !== undefined && {
              notes: updateOrderDto.notes,
            }),
            ...(updateOrderDto.status && {
              status: updateOrderDto.status,
            }),
            ...(updateOrderDto.commercialChannelId && {
              commercialChannel: { connect: { id: updateOrderDto.commercialChannelId } },
            }),
          },
        });

        // 2. Reconciliar items: actualizar existentes, crear nuevos, eliminar removidos
        if (updateOrderDto.items) {
          const currentItems = await tx.orderItem.findMany({
            where: { orderId: id },
          });
          const currentIds = new Set(currentItems.map((i) => i.id));

          // Separar items entrantes en: existentes (id presente en BD) vs nuevos
          const itemsToUpdate: typeof updateOrderDto.items = [];
          const itemsToCreate: typeof updateOrderDto.items = [];

          for (const item of updateOrderDto.items) {
            if (item.id && currentIds.has(item.id)) {
              itemsToUpdate.push(item);
            } else {
              itemsToCreate.push(item);
            }
          }

          const keepIds = new Set(itemsToUpdate.map((i) => i.id!));

          // Eliminar items que no están en la lista entrante
          const idsToDelete = [...currentIds].filter(
            (dbId) => !keepIds.has(dbId),
          );
          if (idsToDelete.length > 0) {
            await tx.orderItem.deleteMany({
              where: { id: { in: idsToDelete } },
            });
          }

          // Actualizar items existentes (solo los que cambiaron se generarán logs de auditoría)
          for (const item of itemsToUpdate) {
            const itemTotal = new Prisma.Decimal(item.quantity).mul(
              item.unitPrice,
            );
            await tx.orderItem.update({
              where: { id: item.id! },
              data: {
                description: item.description,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                total: itemTotal,
                specifications: item.specifications || undefined,
                ...(item.productId && { productId: item.productId }),
              },
            });

            // Reconciliar áreas de producción del item actualizado
            if (item.productionAreaIds !== undefined) {
              await tx.orderItemProductionArea.deleteMany({
                where: { orderItemId: item.id! },
              });
              if (item.productionAreaIds.length > 0) {
                await tx.orderItemProductionArea.createMany({
                  data: item.productionAreaIds.map((areaId) => ({
                    orderItemId: item.id!,
                    productionAreaId: areaId,
                  })),
                });
              }
            }
          }

          // Crear items nuevos
          if (itemsToCreate.length > 0) {
            const remainingCount = currentItems.length - idsToDelete.length;
            for (let i = 0; i < itemsToCreate.length; i++) {
              const item = itemsToCreate[i];
              const itemTotal = new Prisma.Decimal(item.quantity).mul(
                item.unitPrice,
              );
              const createdItem = await tx.orderItem.create({
                data: {
                  orderId: id,
                  description: item.description,
                  quantity: item.quantity,
                  unitPrice: item.unitPrice,
                  total: itemTotal,
                  specifications: item.specifications || undefined,
                  sortOrder: remainingCount + i + 1,
                  ...(item.productId && { productId: item.productId }),
                },
                select: { id: true },
              });

              if (item.productionAreaIds && item.productionAreaIds.length > 0) {
                await tx.orderItemProductionArea.createMany({
                  data: item.productionAreaIds.map((areaId) => ({
                    orderItemId: createdItem.id,
                    productionAreaId: areaId,
                  })),
                });
              }
            }
          }
        }

        // 3. Si se envió pago inicial, actualizar el primero o crear uno
        if (updateOrderDto.initialPayment) {
          const firstPayment = await tx.payment.findFirst({
            where: { orderId: id },
            orderBy: { createdAt: 'asc' },
          });

          const paymentData = {
            amount: new Prisma.Decimal(updateOrderDto.initialPayment.amount),
            paymentMethod: updateOrderDto.initialPayment.paymentMethod,
            reference: updateOrderDto.initialPayment.reference,
            notes: updateOrderDto.initialPayment.notes,
            receivedById: userId,
          };

          if (firstPayment) {
            await tx.payment.update({
              where: { id: firstPayment.id },
              data: paymentData,
            });
          } else {
            await tx.payment.create({
              data: {
                ...paymentData,
                orderId: id,
                paymentDate: new Date(),
              },
            });
          }
        }

        // 4. Recalcular totales, paidAmount y balance
        return this.recalculateOrderTotals(id, tx);
      });

      // Registrar en audit log (fuera de la transacción, sin esperar)
      this.auditLogsService.logOrderChange(
        'UPDATE',
        id,
        oldOrder,
        updatedOrder,
        userId,
      );

      return updatedOrder;
    }

    // Si no hay items ni pago, actualización normal
    // Preparar datos de actualización de fecha
    const deliveryDateUpdateData: any = {};

    if (updateOrderDto.deliveryDate) {
      const newDeliveryDate = new Date(updateOrderDto.deliveryDate);
      const currentDeliveryDate = oldOrder.deliveryDate ? new Date(oldOrder.deliveryDate) : null;

      deliveryDateUpdateData.deliveryDate = newDeliveryDate;

      // Si la fecha cambió, registrar auditoría
      if (currentDeliveryDate && newDeliveryDate.getTime() !== currentDeliveryDate.getTime()) {
        deliveryDateUpdateData.previousDeliveryDate = currentDeliveryDate;
        deliveryDateUpdateData.deliveryDateChangedAt = new Date();
        deliveryDateUpdateData.deliveryDateChangedBy = userId;

        // Solo guardar razón si se pospone
        if (newDeliveryDate > currentDeliveryDate && updateOrderDto.deliveryDateReason) {
          deliveryDateUpdateData.deliveryDateReason = updateOrderDto.deliveryDateReason;
        }
      }
    }

    await this.ordersRepository.update(id, {
      ...(updateOrderDto.clientId && {
        client: { connect: { id: updateOrderDto.clientId } },
      }),
      ...deliveryDateUpdateData,
      ...(updateOrderDto.notes !== undefined && {
        notes: updateOrderDto.notes,
      }),
      ...(updateOrderDto.status && {
        status: updateOrderDto.status,
      }),
      ...(updateOrderDto.commercialChannelId && {
        commercialChannel: { connect: { id: updateOrderDto.commercialChannelId } },
      }),
    });

    // Retornar la orden actualizada con sus relaciones
    const updatedOrder = await this.findOne(id);

    // Registrar en audit log (sin esperar)
    this.auditLogsService.logOrderChange(
      'UPDATE',
      id,
      oldOrder,
      updatedOrder,
      userId,
    );

    return updatedOrder;
  }

  async updateStatus(id: string, status: OrderStatus, userId: string) {
    const order = await this.findOne(id);

    // SECURITY: Prevent reverting to DRAFT status to bypass edit restrictions
    // If an order is already processed (CONFIRMED, etc), it should not go back to DRAFT.
    // Users should use the "Edit Request" flow instead.
    if (status === OrderStatus.DRAFT && order.status !== OrderStatus.DRAFT) {
      throw new BadRequestException(
        'No se puede revertir el estado de la orden a BORRADOR. Por favor, use el flujo de solicitud de edición para modificar la orden.',
      );
    }

    // NEW: Balance validation for PAID/DELIVERED status
    // Orders with pending balance cannot be marked as PAID or DELIVERED
    if (status === OrderStatus.PAID || status === OrderStatus.DELIVERED) {
      const balance = new Prisma.Decimal(order.balance);

      if (balance.greaterThan(0)) {
        throw new BadRequestException(
          `No se puede cambiar al estado ${status === OrderStatus.PAID ? 'PAGADA' : 'ENTREGADA'} con saldo pendiente. ` +
          `Saldo actual: $${order.balance}. ` +
          `Use el estado DELIVERED_ON_CREDIT (Entregado a Crédito) o complete los pagos primero.`,
        );
      }
    }

    // NEW: Authorization check for DELIVERED_ON_CREDIT
    // Non-admin users need approval to deliver on credit
    if (status === OrderStatus.DELIVERED_ON_CREDIT) {
      const authCheck = await this.statusChangeRequestsService.requiresAuthorization(
        id,
        status,
        userId,
      );

      if (authCheck.required) {
        // Check if user has an approved request
        const hasApproval = await this.statusChangeRequestsService.hasApprovedRequest(
          id,
          userId,
          status,
        );

        if (!hasApproval) {
          throw new ForbiddenException(
            `Este cambio de estado requiere autorización de un administrador. ` +
            `Razón: ${authCheck.reason}. ` +
            `Por favor, cree una solicitud de cambio de estado.`,
          );
        }

        // Authorization granted, consume the request (mark as used)
        await this.statusChangeRequestsService.consumeApprovedRequest(
          id,
          userId,
          status,
        );
      }
    }

    // Log change
    if (order.status !== status) {
        await this.ordersRepository.updateStatus(id, status);

        // Registrar en audit log (sin esperar)
        const updatedOrder = await this.findOne(id);
        this.auditLogsService.logOrderChange(
          'UPDATE',
          id,
          order,
          updatedOrder,
          userId,
        );
        return updatedOrder;
    }

    return order;
  }

  async remove(id: string, userId?: string) {
    const order = await this.findOne(id);

    // Solo se pueden eliminar borradores
    const allowedStatuses: OrderStatus[] = [OrderStatus.DRAFT];
    if (!allowedStatuses.includes(order.status)) {
      throw new BadRequestException(
        'Only DRAFT orders can be deleted',
      );
    }

    await this.ordersRepository.delete(id);

    // Registrar en audit log (sin esperar)
    this.auditLogsService.logOrderChange(
      'DELETE',
      id,
      order,
      null,
      userId,
    );

    return { message: 'Order deleted successfully' };
  }

  // ========== ELECTRONIC INVOICE ==========

  async registerElectronicInvoice(id: string, electronicInvoiceNumber: string, userId: string) {
    const order = await this.findOne(id);

    // Solo aplicable si la orden tiene IVA (tax > 0)
    if (parseFloat(order.tax.toString()) === 0) {
      throw new BadRequestException(
        'La factura electrónica solo aplica para órdenes que incluyan IVA.',
      );
    }

    // Solo disponible cuando la orden ya fue creada (no en DRAFT)
    if (order.status === 'DRAFT') {
      throw new BadRequestException(
        'No se puede registrar una factura electrónica en una orden en estado BORRADOR.',
      );
    }

    const updatedOrder = await this.ordersRepository.registerElectronicInvoice(
      id,
      electronicInvoiceNumber,
    );

    // Registrar en audit log (sin esperar)
    this.auditLogsService.logOrderChange(
      'UPDATE',
      id,
      order,
      updatedOrder,
      userId,
    );

    return updatedOrder;
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
          ...(addItemDto.productId && {
            productId: addItemDto.productId,
          }),
          ...(addItemDto.productionAreaIds && addItemDto.productionAreaIds.length > 0 && {
            productionAreas: {
              create: addItemDto.productionAreaIds.map((areaId) => ({
                productionAreaId: areaId,
              })),
            },
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

      if (updateItemDto.productId !== undefined) {
        updateData.productId = updateItemDto.productId;
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

      // Reconciliar áreas de producción
      if (updateItemDto.productionAreaIds !== undefined) {
        await tx.orderItemProductionArea.deleteMany({
          where: { orderItemId: itemId },
        });
        if (updateItemDto.productionAreaIds.length > 0) {
          await tx.orderItemProductionArea.createMany({
            data: updateItemDto.productionAreaIds.map((areaId) => ({
              orderItemId: itemId,
              productionAreaId: areaId,
            })),
          });
        }
      }

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
      OrderStatus.WARRANTY,
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

    // Usar transacción simple y luego obtener el pago completo
    const paymentId = await this.prisma.$transaction(async (tx) => {
      // Crear el pago - solo retornar el ID
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
          receiptFileId: createPaymentDto.receiptFileId,
          receivedById,
        },
        select: {
          id: true,
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

      return payment.id;
    });

    // Obtener el pago completo fuera de la transacción
    return this.prisma.payment.findUnique({
      where: { id: paymentId },
      select: {
        id: true,
        amount: true,
        paymentMethod: true,
        paymentDate: true,
        reference: true,
        notes: true,
        receiptFileId: true,
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

    // Obtener taxRate de la orden
    const order = await tx.order.findUnique({
      where: { id: orderId },
      select: { taxRate: true },
    });

    const taxRate = order?.taxRate || new Prisma.Decimal(0.19);
    const tax = subtotal.mul(taxRate);

    // Calcular discountAmount sumando todos los descuentos
    const discounts = await tx.orderDiscount.findMany({
      where: { orderId },
      select: { amount: true },
    });

    let discountAmount = new Prisma.Decimal(0);
    for (const discount of discounts) {
      discountAmount = discountAmount.add(discount.amount);
    }

    const total = subtotal.add(tax).sub(discountAmount);

    // Calcular paidAmount sumando todos los pagos
    const payments = await tx.payment.findMany({
      where: { orderId },
      select: { amount: true },
    });

    let paidAmount = new Prisma.Decimal(0);
    for (const payment of payments) {
      paidAmount = paidAmount.add(payment.amount);
    }

    const balance = total.sub(paidAmount);

    // Actualizar orden
    return tx.order.update({
      where: { id: orderId },
      data: {
        subtotal,
        tax,
        discountAmount,
        total,
        paidAmount,
        balance,
      },
      select: {
        id: true,
        orderNumber: true,
        subtotal: true,
        tax: true,
        discountAmount: true,
        total: true,
        paidAmount: true,
        balance: true,
        status: true,
        notes: true,
        deliveryDate: true,
        taxRate: true,
        items: {
          include: {
            product: true,
          },
        },
        client: true,
        payments: true,
      },
    });
  }

  // ========== PAYMENT RECEIPT MANAGEMENT ==========

  async uploadPaymentReceipt(
    orderId: string,
    paymentId: string,
    file: Express.Multer.File,
    userId: string,
  ) {
    // Verificar que la orden existe
    await this.findOne(orderId);

    // Verificar que el pago existe y pertenece a la orden
    const payment = await this.prisma.payment.findFirst({
      where: {
        id: paymentId,
        orderId,
      },
    });

    if (!payment) {
      throw new NotFoundException(
        `Payment ${paymentId} not found for order ${orderId}`,
      );
    }

    // Si ya existe un comprobante, eliminarlo primero
    if (payment.receiptFileId) {
      await this.storageService.deleteFile(payment.receiptFileId, userId);
    }

    // Subir el nuevo archivo
    const uploadedFile = await this.storageService.uploadFile(file, {
      entityType: 'payment',
      entityId: paymentId,
      userId,
    });

    // Actualizar el payment con el ID del archivo
    await this.prisma.payment.update({
      where: { id: paymentId },
      data: { receiptFileId: uploadedFile.id },
    });

    return {
      message: 'Receipt uploaded successfully',
      file: uploadedFile,
    };
  }

  async deletePaymentReceipt(orderId: string, paymentId: string) {
    // Verificar que la orden existe
    await this.findOne(orderId);

    // Verificar que el pago existe y pertenece a la orden
    const payment = await this.prisma.payment.findFirst({
      where: {
        id: paymentId,
        orderId,
      },
    });

    if (!payment) {
      throw new NotFoundException(
        `Payment ${paymentId} not found for order ${orderId}`,
      );
    }

    if (!payment.receiptFileId) {
      throw new BadRequestException('Payment does not have a receipt');
    }

    // Eliminar el archivo (hard delete ya que es eliminación explícita por admin)
    await this.storageService.hardDeleteFile(payment.receiptFileId);

    // Actualizar el payment removiendo el ID del archivo
    await this.prisma.payment.update({
      where: { id: paymentId },
      data: { receiptFileId: null },
    });

    return {
      message: 'Receipt deleted successfully',
    };
  }

  // ========== DISCOUNT MANAGEMENT ==========

  async applyDiscount(
    orderId: string,
    applyDiscountDto: ApplyDiscountDto,
    appliedById: string,
  ) {
    const order = await this.findOne(orderId);

    // Solo se pueden aplicar descuentos a órdenes CONFIRMED en adelante
    const allowedStatuses: OrderStatus[] = [
      OrderStatus.CONFIRMED,
      OrderStatus.IN_PRODUCTION,
      OrderStatus.READY,
      OrderStatus.DELIVERED,
      OrderStatus.WARRANTY,
    ];

    if (!allowedStatuses.includes(order.status)) {
      throw new BadRequestException(
        'Los descuentos solo pueden aplicarse a órdenes CONFIRMADAS o en estado posterior',
      );
    }

    const discountAmount = new Prisma.Decimal(applyDiscountDto.amount);

    // Validar que el descuento no exceda el total de la orden
    const currentTotal = new Prisma.Decimal(order.total);
    const currentDiscountAmount = new Prisma.Decimal(order.discountAmount);
    const newDiscountAmount = currentDiscountAmount.add(discountAmount);

    // El total base es subtotal + tax
    const baseTotal = new Prisma.Decimal(order.subtotal).add(order.tax);

    if (newDiscountAmount.greaterThan(baseTotal)) {
      throw new BadRequestException(
        `El descuento total (${newDiscountAmount}) no puede exceder el subtotal + impuestos (${baseTotal})`,
      );
    }

    // Usar transacción para crear descuento y recalcular totales
    const discountId = await this.prisma.$transaction(async (tx) => {
      // Crear el descuento
      const discount = await tx.orderDiscount.create({
        data: {
          orderId,
          amount: discountAmount,
          reason: applyDiscountDto.reason,
          appliedById,
        },
        select: {
          id: true,
        },
      });

      // Recalcular totales de la orden
      await this.recalculateOrderTotals(orderId, tx);

      return discount.id;
    });

    // Obtener el descuento completo fuera de la transacción
    return this.prisma.orderDiscount.findUnique({
      where: { id: discountId },
      select: {
        id: true,
        amount: true,
        reason: true,
        appliedAt: true,
        appliedBy: {
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

  async getDiscounts(orderId: string) {
    // Verificar que la orden existe
    await this.findOne(orderId);

    return this.ordersRepository.findDiscountsByOrderId(orderId);
  }

  async removeDiscount(orderId: string, discountId: string) {
    const order = await this.findOne(orderId);

    // Solo se pueden eliminar descuentos de órdenes CONFIRMED en adelante
    const allowedStatuses: OrderStatus[] = [
      OrderStatus.CONFIRMED,
      OrderStatus.IN_PRODUCTION,
      OrderStatus.READY,
      OrderStatus.DELIVERED,
      OrderStatus.WARRANTY,
    ];

    if (!allowedStatuses.includes(order.status)) {
      throw new BadRequestException(
        'Los descuentos solo pueden eliminarse de órdenes CONFIRMADAS o en estado posterior',
      );
    }

    // Verificar que el descuento existe y pertenece a la orden
    const discount = await this.prisma.orderDiscount.findFirst({
      where: {
        id: discountId,
        orderId,
      },
    });

    if (!discount) {
      throw new NotFoundException(
        `Descuento ${discountId} no encontrado para la orden ${orderId}`,
      );
    }

    // Usar transacción para eliminar descuento y recalcular totales
    return this.prisma.$transaction(async (tx) => {
      // Eliminar el descuento
      await tx.orderDiscount.delete({
        where: { id: discountId },
      });

      // Recalcular totales
      return this.recalculateOrderTotals(orderId, tx);
    });
  }
}
