import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { WorkOrderStatus } from '../../generated/prisma';
import { PrismaService } from '../../database/prisma.service';
import { ConsecutivesService } from '../consecutives/consecutives.service';
import { WorkOrdersRepository } from './work-orders.repository';
import {
  AddSupplyToItemDto,
  CreateWorkOrderDto,
  FilterWorkOrdersDto,
  UpdateWorkOrderDto,
  UpdateWorkOrderStatusDto,
} from './dto';

const ALLOWED_TRANSITIONS: Record<WorkOrderStatus, WorkOrderStatus[]> = {
  [WorkOrderStatus.DRAFT]: [WorkOrderStatus.CONFIRMED, WorkOrderStatus.CANCELLED],
  [WorkOrderStatus.CONFIRMED]: [WorkOrderStatus.IN_PRODUCTION, WorkOrderStatus.CANCELLED],
  [WorkOrderStatus.IN_PRODUCTION]: [WorkOrderStatus.COMPLETED, WorkOrderStatus.CANCELLED],
  [WorkOrderStatus.COMPLETED]: [],
  [WorkOrderStatus.CANCELLED]: [],
};

const EDITABLE_STATUSES: WorkOrderStatus[] = [
  WorkOrderStatus.DRAFT,
  WorkOrderStatus.CONFIRMED,
  WorkOrderStatus.IN_PRODUCTION,
];

@Injectable()
export class WorkOrdersService {
  constructor(
    private readonly workOrdersRepository: WorkOrdersRepository,
    private readonly consecutivesService: ConsecutivesService,
    private readonly prisma: PrismaService,
  ) {}

  async create(dto: CreateWorkOrderDto, advisorId: string, status: WorkOrderStatus = WorkOrderStatus.DRAFT) {
    // 1. Verify the Order exists and is in an allowed status
    const order = await this.prisma.order.findUnique({
      where: { id: dto.orderId },
      include: {
        items: { select: { id: true, description: true } },
      },
    });

    if (!order) {
      throw new NotFoundException(`Orden con id ${dto.orderId} no encontrada`);
    }

    const allowedOrderStatuses = ['CONFIRMED', 'IN_PRODUCTION', 'READY'];
    if (!allowedOrderStatuses.includes(order.status)) {
      throw new BadRequestException(
        `Solo se pueden crear OTs para órdenes en estado CONFIRMED, IN_PRODUCTION o READY. Estado actual: ${order.status}`,
      );
    }

    // 1b. Verify the Order does not already have an active (non-cancelled) work order
    const existingWorkOrder = await this.prisma.workOrder.findFirst({
      where: {
        orderId: dto.orderId,
        status: { not: WorkOrderStatus.CANCELLED },
      },
      select: { workOrderNumber: true },
    });

    if (existingWorkOrder) {
      throw new BadRequestException(
        `La orden ${order.orderNumber} ya tiene una OT activa (${existingWorkOrder.workOrderNumber}). Solo se permite una OT activa por orden de pedido.`,
      );
    }

    // 2. Validate all orderItemIds belong to this order
    const orderItemIds = new Set(order.items.map((item) => item.id));
    for (const item of dto.items) {
      if (!orderItemIds.has(item.orderItemId)) {
        throw new BadRequestException(
          `El item con orderItemId ${item.orderItemId} no pertenece a la orden ${dto.orderId}`,
        );
      }
    }

    // 3. Build items with productDescription from OrderItem if not provided
    const orderItemMap = new Map(order.items.map((item) => [item.id, item]));
    const itemsData = dto.items.map((item) => ({
      orderItemId: item.orderItemId,
      productDescription: item.productDescription ?? orderItemMap.get(item.orderItemId)!.description,
      observations: item.observations,
      productionAreaIds: item.productionAreaIds,
      supplies: item.supplies?.map((s) => ({
        supplyId: s.supplyId,
        quantity: s.quantity,
        notes: s.notes,
      })),
    }));

    // 4. Generate work order number and create (with retry on unique constraint)
    const MAX_RETRIES = 3;
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      const workOrderNumber = await this.consecutivesService.generateNumber('WORK_ORDER');

      try {
        return await this.workOrdersRepository.create({
          workOrderNumber,
          orderId: dto.orderId,
          advisorId,
          designerId: dto.designerId,
          fileName: dto.fileName,
          observations: dto.observations,
          status,
          items: itemsData,
        });
      } catch (error: any) {
        const isUniqueViolation = error?.code === 'P2002';
        if (isUniqueViolation && attempt < MAX_RETRIES - 1) {
          // Sync the counter with actual DB values and retry
          await this.consecutivesService.syncWorkOrderCounter();
          continue;
        }
        throw error;
      }
    }
  }

  async findAll(filters: FilterWorkOrdersDto) {
    return this.workOrdersRepository.findAll(filters);
  }

  async findOne(id: string) {
    const workOrder = await this.workOrdersRepository.findById(id);
    if (!workOrder) {
      throw new NotFoundException(`OT con id ${id} no encontrada`);
    }
    return workOrder;
  }

  async update(id: string, dto: UpdateWorkOrderDto) {
    const workOrder = await this.workOrdersRepository.findById(id);
    if (!workOrder) {
      throw new NotFoundException(`OT con id ${id} no encontrada`);
    }

    if (!EDITABLE_STATUSES.includes(workOrder.status as WorkOrderStatus)) {
      throw new BadRequestException(
        `No se puede modificar una OT en estado ${workOrder.status}. Solo se permite editar en estados DRAFT, CONFIRMED o IN_PRODUCTION.`,
      );
    }

    const { items, ...scalarData } = dto;

    // Update scalar fields
    if (Object.keys(scalarData).length > 0) {
      await this.workOrdersRepository.update(id, scalarData);
    }

    // Reconcile items if provided
    if (items && items.length > 0) {
      // Verify orderItemIds belong to the order
      const order = await this.prisma.order.findUnique({
        where: { id: workOrder.order.id },
        include: { items: { select: { id: true, description: true } } },
      });

      const orderItemMap = new Map(order!.items.map((i) => [i.id, i]));

      for (const item of items) {
        // Find the corresponding workOrderItem by orderItemId
        const woItem = workOrder.items.find(
          (i: (typeof workOrder.items)[number]) => i.orderItem.id === item.orderItemId,
        );
        if (!woItem) {
          continue;
        }

        await this.workOrdersRepository.updateItem(woItem.id, {
          productDescription: item.productDescription ?? orderItemMap.get(item.orderItemId)?.description,
          observations: item.observations,
          productionAreaIds: item.productionAreaIds,
          supplies: item.supplies?.map((s) => ({
            supplyId: s.supplyId,
            quantity: s.quantity,
            notes: s.notes,
          })),
        });
      }
    }

    return this.workOrdersRepository.findById(id);
  }

  async updateStatus(id: string, dto: UpdateWorkOrderStatusDto) {
    const workOrder = await this.workOrdersRepository.findById(id);
    if (!workOrder) {
      throw new NotFoundException(`OT con id ${id} no encontrada`);
    }

    const currentStatus = workOrder.status as WorkOrderStatus;
    const allowedNext = ALLOWED_TRANSITIONS[currentStatus];

    if (!allowedNext.includes(dto.status)) {
      throw new BadRequestException(
        `No se puede cambiar el estado de ${currentStatus} a ${dto.status}. Transiciones permitidas: ${allowedNext.join(', ') || 'ninguna'}`,
      );
    }

    return this.workOrdersRepository.updateStatus(id, dto.status);
  }

  async addSupplyToItem(workOrderId: string, itemId: string, dto: AddSupplyToItemDto) {
    // Verify work order exists
    const workOrder = await this.workOrdersRepository.findById(workOrderId);
    if (!workOrder) {
      throw new NotFoundException(`OT con id ${workOrderId} no encontrada`);
    }

    // Verify item belongs to the work order
    const item = await this.workOrdersRepository.findItemById(workOrderId, itemId);
    if (!item) {
      throw new NotFoundException(`Item con id ${itemId} no encontrado en la OT ${workOrderId}`);
    }

    return this.workOrdersRepository.addSupplyToItem(itemId, {
      supplyId: dto.supplyId,
      quantity: dto.quantity,
      notes: dto.notes,
    });
  }

  async removeSupplyFromItem(workOrderId: string, itemId: string, supplyId: string) {
    const workOrder = await this.workOrdersRepository.findById(workOrderId);
    if (!workOrder) {
      throw new NotFoundException(`OT con id ${workOrderId} no encontrada`);
    }

    const item = await this.workOrdersRepository.findItemById(workOrderId, itemId);
    if (!item) {
      throw new NotFoundException(`Item con id ${itemId} no encontrado en la OT ${workOrderId}`);
    }

    return this.workOrdersRepository.removeSupplyFromItem(itemId, supplyId);
  }

  async remove(id: string) {
    const workOrder = await this.workOrdersRepository.findById(id);
    if (!workOrder) {
      throw new NotFoundException(`OT con id ${id} no encontrada`);
    }

    if (workOrder.status !== WorkOrderStatus.DRAFT) {
      throw new BadRequestException(
        `Solo se pueden eliminar OTs en estado DRAFT. Estado actual: ${workOrder.status}`,
      );
    }

    return this.workOrdersRepository.delete(id);
  }
}
