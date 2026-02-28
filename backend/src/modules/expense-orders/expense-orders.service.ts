import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ExpenseOrderStatus } from '../../generated/prisma';
import { PrismaService } from '../../database/prisma.service';
import { ConsecutivesService } from '../consecutives/consecutives.service';
import { ExpenseOrdersRepository } from './expense-orders.repository';
import {
  CreateExpenseItemDto,
  CreateExpenseOrderDto,
  FilterExpenseOrdersDto,
  UpdateExpenseOrderDto,
  UpdateExpenseOrderStatusDto,
} from './dto';
import { AuthenticatedUser } from '../../common/interfaces/auth.interface';
import { ExpenseOrderAuthRequestsService } from '../expense-order-auth-requests/expense-order-auth-requests.service';

const ALLOWED_TRANSITIONS: Record<ExpenseOrderStatus, ExpenseOrderStatus[]> = {
  [ExpenseOrderStatus.DRAFT]: [ExpenseOrderStatus.CREATED, ExpenseOrderStatus.AUTHORIZED],
  [ExpenseOrderStatus.CREATED]: [ExpenseOrderStatus.AUTHORIZED, ExpenseOrderStatus.DRAFT],
  [ExpenseOrderStatus.AUTHORIZED]: [ExpenseOrderStatus.PAID],
  [ExpenseOrderStatus.PAID]: [],
};

const EDITABLE_STATUSES: ExpenseOrderStatus[] = [
  ExpenseOrderStatus.DRAFT,
  ExpenseOrderStatus.CREATED,
];

@Injectable()
export class ExpenseOrdersService {
  constructor(
    private readonly repository: ExpenseOrdersRepository,
    private readonly consecutivesService: ConsecutivesService,
    private readonly prisma: PrismaService,
    private readonly authRequestsService: ExpenseOrderAuthRequestsService,
  ) {}

  async create(
    dto: CreateExpenseOrderDto,
    createdById: string,
    status: ExpenseOrderStatus = ExpenseOrderStatus.DRAFT,
  ) {
    // Validate WorkOrder exists if provided
    if (dto.workOrderId) {
      const workOrder = await this.prisma.workOrder.findUnique({
        where: { id: dto.workOrderId },
      });
      if (!workOrder) {
        throw new NotFoundException(`OT con id ${dto.workOrderId} no encontrada`);
      }
    }

    // Validate: productionAreaIds only allowed when workOrderId is provided
    for (const item of dto.items) {
      if (item.productionAreaIds?.length && !dto.workOrderId) {
        throw new BadRequestException(
          'Las áreas de producción en los ítems solo se permiten cuando la OG está asociada a una OT',
        );
      }
    }

    // Validate ExpenseType and Subcategory belong to each other
    const subcategory = await this.prisma.expenseSubcategory.findFirst({
      where: {
        id: dto.expenseSubcategoryId,
        expenseTypeId: dto.expenseTypeId,
      },
    });
    if (!subcategory) {
      throw new BadRequestException(
        'La subcategoría no pertenece al tipo de gasto indicado',
      );
    }

    // Generate OG number
    const ogNumber = await this.consecutivesService.generateNumber('EXPENSE');

    // Build items with computed total
    const itemsData = dto.items.map((item, index) => ({
      quantity: item.quantity,
      name: item.name,
      description: item.description,
      supplierId: item.supplierId,
      unitPrice: item.unitPrice,
      total: item.quantity * item.unitPrice,
      paymentMethod: item.paymentMethod,
      receiptFileId: item.receiptFileId,
      productionAreaIds: item.productionAreaIds,
      sortOrder: index,
    }));

    return this.repository.create({
      ogNumber,
      expenseTypeId: dto.expenseTypeId,
      expenseSubcategoryId: dto.expenseSubcategoryId,
      workOrderId: dto.workOrderId,
      authorizedToId: dto.authorizedToId,
      responsibleId: dto.responsibleId,
      observations: dto.observations,
      areaOrMachine: dto.areaOrMachine,
      status,
      createdById,
      items: itemsData,
    });
  }

  async findAll(filters: FilterExpenseOrdersDto) {
    return this.repository.findAll(filters);
  }

  async findOne(id: string) {
    const expenseOrder = await this.repository.findById(id);
    if (!expenseOrder) {
      throw new NotFoundException(`OG con id ${id} no encontrada`);
    }
    return expenseOrder;
  }

  async update(id: string, dto: UpdateExpenseOrderDto) {
    const expenseOrder = await this.repository.findById(id);
    if (!expenseOrder) {
      throw new NotFoundException(`OG con id ${id} no encontrada`);
    }

    if (!EDITABLE_STATUSES.includes(expenseOrder.status as ExpenseOrderStatus)) {
      throw new BadRequestException(
        `No se puede modificar una OG en estado ${expenseOrder.status}. Solo se permite editar en estados DRAFT o CREATED.`,
      );
    }

    // Validate new workOrderId if changed
    const workOrderId = dto.workOrderId !== undefined ? dto.workOrderId : expenseOrder.workOrder?.id;
    if (dto.workOrderId) {
      const workOrder = await this.prisma.workOrder.findUnique({
        where: { id: dto.workOrderId },
      });
      if (!workOrder) {
        throw new NotFoundException(`OT con id ${dto.workOrderId} no encontrada`);
      }
    }

    // Validate items' productionAreaIds
    if (dto.items) {
      for (const item of dto.items) {
        if (item.productionAreaIds?.length && !workOrderId) {
          throw new BadRequestException(
            'Las áreas de producción en los ítems solo se permiten cuando la OG está asociada a una OT',
          );
        }
      }
    }

    // Validate subcategory belongs to type
    if (dto.expenseTypeId || dto.expenseSubcategoryId) {
      const typeId = dto.expenseTypeId ?? expenseOrder.expenseType.id;
      const subcatId = dto.expenseSubcategoryId ?? expenseOrder.expenseSubcategory.id;
      const subcategory = await this.prisma.expenseSubcategory.findFirst({
        where: { id: subcatId, expenseTypeId: typeId },
      });
      if (!subcategory) {
        throw new BadRequestException('La subcategoría no pertenece al tipo de gasto indicado');
      }
    }

    const { items, ...scalarData } = dto;

    // Update scalar fields
    if (Object.keys(scalarData).length > 0) {
      await this.repository.update(id, scalarData);
    }

    // Replace items if provided
    if (items && items.length > 0) {
      const itemsData = items.map((item, index) => ({
        quantity: item.quantity ?? 1,
        name: item.name ?? '',
        description: item.description,
        supplierId: item.supplierId,
        unitPrice: item.unitPrice ?? 0,
        total: (item.quantity ?? 1) * (item.unitPrice ?? 0),
        paymentMethod: item.paymentMethod ?? 'CASH',
        receiptFileId: item.receiptFileId,
        productionAreaIds: item.productionAreaIds,
        sortOrder: index,
      }));
      await this.repository.replaceItems(id, itemsData);
    }

    return this.repository.findById(id);
  }

  async addItem(id: string, dto: CreateExpenseItemDto) {
    const expenseOrder = await this.repository.findById(id);
    if (!expenseOrder) {
      throw new NotFoundException(`OG con id ${id} no encontrada`);
    }

    if (!EDITABLE_STATUSES.includes(expenseOrder.status as ExpenseOrderStatus)) {
      throw new BadRequestException(
        `No se puede agregar ítems a una OG en estado ${expenseOrder.status}. Solo se permite en estados DRAFT o CREATED.`,
      );
    }

    // Validate: productionAreaIds only allowed when OG has a workOrder
    if (dto.productionAreaIds?.length && !expenseOrder.workOrder) {
      throw new BadRequestException(
        'Las áreas de producción en los ítems solo se permiten cuando la OG está asociada a una OT',
      );
    }

    // Compute sortOrder as next after existing items
    const sortOrder = expenseOrder.items.length;

    await this.repository.addItem(id, {
      quantity: dto.quantity,
      name: dto.name,
      description: dto.description,
      supplierId: dto.supplierId,
      unitPrice: dto.unitPrice,
      total: dto.quantity * dto.unitPrice,
      paymentMethod: dto.paymentMethod,
      receiptFileId: dto.receiptFileId,
      productionAreaIds: dto.productionAreaIds,
      sortOrder,
    });

    // Return the full updated expense order
    return this.repository.findById(id);
  }

  async updateStatus(id: string, dto: UpdateExpenseOrderStatusDto, currentUser: AuthenticatedUser) {
    const expenseOrder = await this.repository.findById(id);
    if (!expenseOrder) {
      throw new NotFoundException(`OG con id ${id} no encontrada`);
    }

    const currentStatus = expenseOrder.status as ExpenseOrderStatus;
    const allowedNext = ALLOWED_TRANSITIONS[currentStatus];

    if (!allowedNext.includes(dto.status)) {
      throw new BadRequestException(
        `No se puede cambiar el estado de ${currentStatus} a ${dto.status}. Transiciones permitidas: ${allowedNext.join(', ') || 'ninguna'}`,
      );
    }

    // Solo admin puede cambiar a AUTHORIZED directamente; no-admins necesitan solicitud aprobada
    if (dto.status === ExpenseOrderStatus.AUTHORIZED) {
      const user = await this.prisma.user.findUnique({
        where: { id: currentUser.id },
        include: { role: true },
      });

      const isAdmin = user?.role?.name === 'admin';

      if (isAdmin) {
        // Admin autoriza directo — registrar quién autorizó
        return this.repository.updateStatus(id, dto.status, currentUser.id, new Date());
      }

      // No-admin: verificar si tiene solicitud aprobada
      const hasApproval = await this.authRequestsService.hasApprovedRequest(id, currentUser.id);
      if (!hasApproval) {
        throw new ForbiddenException(
          'Autorizar una OG requiere aprobación de un administrador. Por favor, cree una solicitud de autorización.',
        );
      }

      // Obtener el admin que aprobó y registrarlo como autorizador
      const approvedRequest = await this.authRequestsService.getApprovedRequest(id, currentUser.id);
      await this.authRequestsService.consumeApprovedRequest(id, currentUser.id);
      return this.repository.updateStatus(id, dto.status, approvedRequest!.reviewedById!, new Date());
    }

    // Only users with 'approve_expense_orders' permission can mark as PAID
    if (dto.status === ExpenseOrderStatus.PAID) {
      const role = await this.prisma.role.findUnique({
        where: { id: currentUser.roleId },
        include: {
          permissions: { include: { permission: { select: { name: true } } } },
        },
      });
      const userPermissions = role?.permissions.map((rp) => rp.permission.name) ?? [];
      if (!userPermissions.includes('approve_expense_orders')) {
        throw new ForbiddenException(
          'Solo usuarios con permiso "approve_expense_orders" pueden marcar una OG como PAID',
        );
      }
    }

    return this.repository.updateStatus(id, dto.status);
  }

  async remove(id: string) {
    const expenseOrder = await this.repository.findById(id);
    if (!expenseOrder) {
      throw new NotFoundException(`OG con id ${id} no encontrada`);
    }

    if (expenseOrder.status !== ExpenseOrderStatus.DRAFT) {
      throw new BadRequestException(
        `Solo se pueden eliminar OGs en estado DRAFT. Estado actual: ${expenseOrder.status}`,
      );
    }

    return this.repository.delete(id);
  }
}
