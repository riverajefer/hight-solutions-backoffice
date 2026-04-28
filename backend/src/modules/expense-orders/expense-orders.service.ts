import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  forwardRef,
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
import { AccountsPayableService } from '../accounts-payable/accounts-payable.service';

const ALLOWED_TRANSITIONS: Record<ExpenseOrderStatus, ExpenseOrderStatus[]> = {
  [ExpenseOrderStatus.DRAFT]: [ExpenseOrderStatus.CREATED, ExpenseOrderStatus.ADMIN_AUTHORIZED],
  [ExpenseOrderStatus.CREATED]: [ExpenseOrderStatus.ADMIN_AUTHORIZED, ExpenseOrderStatus.DRAFT],
  [ExpenseOrderStatus.ADMIN_AUTHORIZED]: [], // La segunda firma usa el endpoint dedicado /caja-authorize
  [ExpenseOrderStatus.AUTHORIZED]: [],
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
    @Inject(forwardRef(() => ExpenseOrderAuthRequestsService))
    private readonly authRequestsService: ExpenseOrderAuthRequestsService,
    private readonly accountsPayableService: AccountsPayableService,
  ) {}

  async create(
    dto: CreateExpenseOrderDto,
    createdById: string,
    status: ExpenseOrderStatus = ExpenseOrderStatus.DRAFT,
  ) {
    // Si el creador es admin, la OG no necesita aprobación administrativa:
    // pasa directamente a ADMIN_AUTHORIZED para que solo Caja deba firmarla.
    const creator = await this.prisma.user.findUnique({
      where: { id: createdById },
      include: { role: true },
    });
    const creatorIsAdmin = creator?.role?.name === 'admin';
    if (creatorIsAdmin) {
      status = ExpenseOrderStatus.ADMIN_AUTHORIZED;
    }
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
      referenceFileId: item.referenceFileId,
      productionAreaIds: item.productionAreaIds,
      sortOrder: index,
    }));

    // Reintento en caso de colisión de consecutivo
    const maxAttempts = 3;
    let attempts = 0;
    let currentOgNumber = await this.consecutivesService.generateNumber('EXPENSE');

    while (attempts < maxAttempts) {
      attempts++;
      try {
        const created = await this.repository.create({
          ogNumber: currentOgNumber,
          expenseTypeId: dto.expenseTypeId,
          expenseSubcategoryId: dto.expenseSubcategoryId,
          workOrderId: dto.workOrderId,
          authorizedToId: dto.authorizedToId,
          responsibleId: dto.responsibleId,
          observations: dto.observations,
          areaOrMachine: dto.areaOrMachine,
          status,
          createdById,
          ...(creatorIsAdmin && {
            authorizedById: createdById,
            authorizedAt: new Date(),
          }),
          items: itemsData,
        });

        const totalAmount = (created.items as Array<{ total: unknown }>).reduce(
          (sum, item) => sum + Number(item.total),
          0,
        );
        await this.accountsPayableService.createFromExpenseOrder(
          created.id,
          `Orden de Gasto ${created.ogNumber}`,
          totalAmount,
          createdById,
        );

        return created;
      } catch (error: any) {
        const isUniqueConstraintError = error.code === 'P2002';
        const target = JSON.stringify(error.meta?.target || '');
        const isNumberTarget = 
          target.includes('og_number') || 
          target.includes('expense_orders_og_number_key') ||
          (error.meta?.modelName === 'ExpenseOrder' && (error.meta?.target === undefined || target === '""'));

        if (isUniqueConstraintError && isNumberTarget && attempts < maxAttempts) {
          await this.consecutivesService.syncCounter('EXPENSE');
          currentOgNumber = await this.consecutivesService.generateNumber('EXPENSE');
          continue;
        }
        throw error;
      }
    }
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
        referenceFileId: item.referenceFileId,
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
      referenceFileId: dto.referenceFileId,
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

    // ─── Rama A: primera autorización (Admin → ADMIN_AUTHORIZED) ────────────────
    // Solo Admin puede hacerlo directamente; no-admins necesitan solicitud aprobada.
    // No crea movimientos de caja.
    if (dto.status === ExpenseOrderStatus.ADMIN_AUTHORIZED) {
      const user = await this.prisma.user.findUnique({
        where: { id: currentUser.id },
        include: { role: true },
      });

      const isAdmin = user?.role?.name === 'admin';

      if (!isAdmin) {
        const hasApproval = await this.authRequestsService.hasApprovedRequest(id, currentUser.id);
        if (!hasApproval) {
          throw new ForbiddenException(
            'Autorizar una OG requiere aprobación de un administrador. Por favor, cree una solicitud de autorización.',
          );
        }

        const approvedRequest = await this.authRequestsService.getApprovedRequest(id, currentUser.id);
        await this.authRequestsService.consumeApprovedRequest(id, currentUser.id);
        await this.repository.updateStatus(id, dto.status, {
          authorizedById: approvedRequest!.reviewedById!,
          authorizedAt: new Date(),
        });
      } else {
        await this.repository.updateStatus(id, dto.status, {
          authorizedById: currentUser.id,
          authorizedAt: new Date(),
        });
      }

      return this.repository.findById(id);
    }

    return this.repository.updateStatus(id, dto.status);
  }

  // ─── Segunda firma Caja (endpoint dedicado /caja-authorize) ───────────────────
  // Requiere permiso 'caja_authorize_expense_orders' (verificado en el Controller).
  // La OG debe estar en ADMIN_AUTHORIZED. Crea movimientos de caja y auto-paga.
  async cajaAuthorize(id: string, currentUser: AuthenticatedUser) {
    const expenseOrder = await this.repository.findById(id);
    if (!expenseOrder) {
      throw new NotFoundException(`OG con id ${id} no encontrada`);
    }

    if (expenseOrder.status !== ExpenseOrderStatus.ADMIN_AUTHORIZED) {
      throw new BadRequestException(
        `La OG debe estar en estado ADMIN_AUTHORIZED para ser autorizada por Caja. Estado actual: ${expenseOrder.status}`,
      );
    }

    // Registrar autorización de Caja
    await this.repository.updateStatus(id, ExpenseOrderStatus.AUTHORIZED, {
      cajaAuthorizedById: currentUser.id,
      cajaAuthorizedAt: new Date(),
    });

    // Crear movimientos de caja + auto-transición a PAID
    const activeSession = await this.prisma.cashSession.findFirst({
      where: { status: 'OPEN' },
    });

    if (!activeSession) {
      throw new BadRequestException(
        'No hay una sesión de caja abierta activa. La OG fue autorizada por Caja pero no se pudo registrar el pago.',
      );
    }

    for (const item of expenseOrder.items) {
      const receiptNumber = await this.consecutivesService.generateNumber('CASH_RECEIPT');
      await this.prisma.cashMovement.create({
        data: {
          amount: item.total,
          movementType: 'EXPENSE',
          paymentMethod: item.paymentMethod || 'CASH',
          description: `Pago de ítem de Orden de Gasto ${expenseOrder.ogNumber}`,
          receiptNumber,
          cashSessionId: activeSession.id,
          performedById: currentUser.id,
          referenceType: 'EXPENSE_ORDER',
          referenceId: expenseOrder.id,
        },
      });
    }

    const paid = await this.repository.updateStatus(id, ExpenseOrderStatus.PAID);

    // Crear Cuenta por Pagar automáticamente si no existe una asociada
    const totalAmount = expenseOrder.items.reduce(
      (sum: number, item: { total: unknown }) => sum + Number(item.total),
      0,
    );
    await this.accountsPayableService.createFromExpenseOrder(
      id,
      `Orden de Gasto ${expenseOrder.ogNumber}`,
      totalAmount,
      currentUser.id,
    );

    return paid;
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
