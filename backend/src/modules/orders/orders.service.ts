import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { OrdersRepository } from './orders.repository';
import { ConsecutivesService } from '../consecutives/consecutives.service';
import { CreateOrderDto, UpdateOrderDto } from './dto';
import { OrderStatus, Prisma } from '../../generated/prisma';

@Injectable()
export class OrdersService {
  constructor(
    private readonly ordersRepository: OrdersRepository,
    private readonly consecutivesService: ConsecutivesService,
  ) {}

  async findAll(status?: OrderStatus) {
    return this.ordersRepository.findAll(status);
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
    const balance = total; // Inicialmente no hay abonos

    // Crear orden con items
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
      paidAmount: 0,
      balance,
      notes: createOrderDto.notes,
      client: { connect: { id: createOrderDto.clientId } },
      createdBy: { connect: { id: createdById } },
      items: {
        create: items,
      },
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
}
