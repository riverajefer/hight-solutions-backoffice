import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import {
  OrdersRepository,
  buildOrderSearchFilter,
  buildOrderStatusFilter,
} from './orders.repository';
import { ConsecutivesService } from '../consecutives/consecutives.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { StorageService } from '../storage/storage.service';
import { OrderStatusChangeRequestsService } from '../order-status-change-requests/order-status-change-requests.service';
import { AdvancePaymentApprovalsService } from '../advance-payment-approvals/advance-payment-approvals.service';
import { PaymentEditApprovalsService } from '../payment-edit-approvals/payment-edit-approvals.service';
import { DiscountApprovalsService } from '../discount-approvals/discount-approvals.service';
import { ClientOwnershipAuthRequestsService } from '../client-ownership-auth-requests/client-ownership-auth-requests.service';
import {
  CreateOrderDto,
  UpdateOrderDto,
  FilterOrdersDto,
  AddOrderItemDto,
  UpdateOrderItemDto,
  CreatePaymentDto,
  UpdatePaymentDto,
  ApplyDiscountDto,
  OrderProfitabilityDto,
  OrderProfitabilityListItemDto,
  PaginatedProfitabilityDto,
  ExpenseOrderSummaryDto,
  UpsertSalesGoalDto,
  FilterSalesGoalsDto,
  OrdersDashboardQueryDto,
} from './dto';
import { InitialPaymentDto } from './dto/create-order.dto';
import { EditRequestStatus, OrderStatus, PaymentMethod, Prisma } from '../../generated/prisma';
import { isValidTransition, getValidNextStatuses } from './order-status-transitions';
import { PrismaService } from '../../database/prisma.service';
import { startOfDay, endOfDay, businessToday } from '../../common/utils/date-range.util';
import {
  computeNetPaidAmount,
  computeOrderBalance,
} from '../../common/utils/order-balance.util';
import { CreditBalanceService } from '../credit-balance/credit-balance.service';

/** Usuario mínimo asociado a un evento del historial de autorizaciones. */
export interface AuthHistoryUser {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
}

/** Evento normalizado del historial de aprobaciones/solicitudes de autorización de una OP. */
export interface AuthorizationHistoryEvent {
  id: string;
  type:
    | 'ADVANCE_PAYMENT'
    | 'DISCOUNT'
    | 'CLIENT_OWNERSHIP'
    | 'PAYMENT_EDIT'
    | 'EDIT_REQUEST';
  status: EditRequestStatus;
  reason: string | null;
  /** Monto asociado (anticipo, descuento, edición de pago); null si no aplica. */
  amount: string | null;
  /** Asesor destino (solo propiedad de cliente); null si no aplica. */
  advisor: AuthHistoryUser | null;
  createdAt: Date;
  reviewedAt: Date | null;
  reviewNotes: string | null;
  requestedBy: AuthHistoryUser;
  reviewedBy: AuthHistoryUser | null;
}

/** Resumen del mini dashboard de la lista de órdenes de pedido. */
export interface OrdersDashboardSummary {
  salesAmount: string;
  salesCount: number;
  collectedAmount: string;
  paymentsCount: number;
  receivableAmount: string;
  receivableCount: number;
  pendingAdvancesCount: number;
}

/** Redondeo comercial colombiano al múltiplo de 100 más cercano según regla de denominaciones. */
function applyColombianRounding(value: Prisma.Decimal): Prisma.Decimal {
  const truncated = value.toDecimalPlaces(0, Prisma.Decimal.ROUND_DOWN);
  const lastTwo = truncated.mod(100).toNumber();
  if (lastTwo === 0) return truncated;
  if (lastTwo >= 1 && lastTwo <= 40) return truncated.sub(lastTwo);
  return truncated.add(100 - lastTwo);
}

/**
 * Rastro de una edición de pago que modificó un movimiento de caja cuya sesión
 * ya estaba cerrada. Se permite hacerlo (corregir un monto mal digitado no
 * puede quedar bloqueado), pero queda registrado: el arqueo de esa sesión
 * dejó de reflejar sus movimientos.
 */
interface MovementEditedAfterClose {
  movementId: string;
  sessionId: string;
  oldAmount: string;
  newAmount: string;
  oldPaymentMethod: string;
  newPaymentMethod: string;
}

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    private readonly ordersRepository: OrdersRepository,
    private readonly consecutivesService: ConsecutivesService,
    private readonly prisma: PrismaService,
    private readonly auditLogsService: AuditLogsService,
    private readonly storageService: StorageService,
    private readonly statusChangeRequestsService: OrderStatusChangeRequestsService,
    private readonly advancePaymentApprovalsService: AdvancePaymentApprovalsService,
    private readonly paymentEditApprovalsService: PaymentEditApprovalsService,
    private readonly discountApprovalsService: DiscountApprovalsService,
    private readonly clientOwnershipAuthRequestsService: ClientOwnershipAuthRequestsService,
    private readonly creditBalanceService: CreditBalanceService,
  ) {}

  async findAll(filters: FilterOrdersDto) {
    const { status, search, clientId, orderDateFrom, orderDateTo, paymentDateFrom, paymentDateTo, page, limit, excludeWithWorkOrder, productionAreaId, createdById, hasBalance, advancePaymentStatus, excludeAnulado } = filters;

    return this.ordersRepository.findAllWithFilters({
      status,
      search,
      clientId,
      orderDateFrom: startOfDay(orderDateFrom),
      orderDateTo: endOfDay(orderDateTo),
      paymentDateFrom: startOfDay(paymentDateFrom),
      paymentDateTo: endOfDay(paymentDateTo),
      page,
      limit,
      excludeWithWorkOrder,
      productionAreaId,
      createdById,
      hasBalance,
      advancePaymentStatus,
      excludeAnulado,
    });
  }

  /**
   * Mini dashboard de la lista de OP. Todas las métricas se acotan al rango de
   * fechas recibido (por defecto, hoy) y excluyen las órdenes anuladas.
   */
  async getDashboardSummary(query: OrdersDashboardQueryDto): Promise<OrdersDashboardSummary> {
    const today = businessToday();
    const from = startOfDay(query.dateFrom ?? today)!;
    const to = endOfDay(query.dateTo ?? today)!;

    const notAnulado = { not: OrderStatus.ANULADO } as const;
    const inRange: Prisma.OrderWhereInput = {
      orderDate: { gte: from, lte: to },
      status: notAnulado,
    };

    const [sales, collected, receivable, pendingAdvances] =
      await Promise.all([
        this.prisma.order.aggregate({
          where: { orderDate: { gte: from, lte: to }, status: notAnulado },
          _sum: { total: true },
          _count: { id: true },
        }),
        this.prisma.payment.aggregate({
          where: {
            paymentDate: { gte: from, lte: to },
            order: { status: notAnulado },
          },
          _sum: { amount: true },
          _count: { id: true },
        }),
        this.prisma.order.aggregate({
          where: {
            orderDate: { gte: from, lte: to },
            status: notAnulado,
            balance: { gt: 0 },
          },
          _sum: { balance: true },
          _count: { id: true },
        }),
        this.prisma.order.count({
          where: { ...inRange, advancePaymentStatus: EditRequestStatus.PENDING },
        }),
      ]);

    return {
      salesAmount: (sales._sum.total ?? new Prisma.Decimal(0)).toString(),
      salesCount: sales._count.id,
      collectedAmount: (collected._sum.amount ?? new Prisma.Decimal(0)).toString(),
      paymentsCount: collected._count.id,
      receivableAmount: (receivable._sum.balance ?? new Prisma.Decimal(0)).toString(),
      receivableCount: receivable._count.id,
      pendingAdvancesCount: pendingAdvances,
    };
  }

  async getSalesSummary(filters: FilterOrdersDto) {
    const { status, clientId, orderDateFrom, orderDateTo, productionAreaId, createdById, search, excludeAnulado } = filters;

    const where: Prisma.OrderWhereInput = {};

    const statusFilter = buildOrderStatusFilter(status, excludeAnulado);
    if (statusFilter !== undefined) where.status = statusFilter;
    if (clientId) where.clientId = clientId;
    if (productionAreaId) {
      where.items = { some: { productionAreas: { some: { productionAreaId } } } };
    }
    if (createdById) where.createdById = createdById;
    if (orderDateFrom || orderDateTo) {
      where.orderDate = {};
      if (orderDateFrom) where.orderDate.gte = startOfDay(orderDateFrom);
      if (orderDateTo) where.orderDate.lte = endOfDay(orderDateTo);
    }
    if (search) {
      where.OR = buildOrderSearchFilter(search);
    }

    const [aggregate, grouped] = await Promise.all([
      this.prisma.order.aggregate({
        where,
        _sum: { total: true, subtotal: true, discountAmount: true },
        _count: { id: true },
      }),
      createdById
        ? Promise.resolve([])
        : this.prisma.order.groupBy({
            by: ['createdById'],
            where,
            _sum: { total: true, subtotal: true, discountAmount: true },
            _count: { id: true },
          }),
    ]);

    const totalRevenue = Number(aggregate._sum.total ?? 0);
    // Base sin IVA: subtotal de los items, antes de descuentos.
    const totalSubtotal = Number(aggregate._sum.subtotal ?? 0);
    const totalDiscounts = Number(aggregate._sum.discountAmount ?? 0);
    // Venta neta sin IVA (subtotal - descuentos): es la cifra que cuenta para las metas.
    const totalNetSubtotal = totalSubtotal - totalDiscounts;
    const totalOrders = aggregate._count.id;
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    let advisorBreakdown: Array<{
      advisorId: string;
      advisorName: string;
      totalRevenue: number;
      totalSubtotal: number;
      totalDiscounts: number;
      totalNetSubtotal: number;
      totalOrders: number;
    }> = [];

    if (grouped.length > 0) {
      const advisorIds = grouped.map((g) => g.createdById);
      const advisors = await this.prisma.user.findMany({
        where: { id: { in: advisorIds } },
        select: { id: true, firstName: true, lastName: true },
      });
      const advisorMap = new Map(advisors.map((a) => [a.id, a]));

      advisorBreakdown = grouped.map((g) => {
        const advisor = advisorMap.get(g.createdById);
        const firstName = advisor?.firstName ?? '';
        const lastName = advisor?.lastName ?? '';
        const subtotal = Number(g._sum.subtotal ?? 0);
        const discounts = Number(g._sum.discountAmount ?? 0);
        return {
          advisorId: g.createdById,
          advisorName: `${firstName} ${lastName}`.trim() || g.createdById,
          totalRevenue: Number(g._sum.total ?? 0),
          totalSubtotal: subtotal,
          totalDiscounts: discounts,
          totalNetSubtotal: subtotal - discounts,
          totalOrders: g._count.id,
        };
      });
    }

    return {
      totalRevenue,
      totalSubtotal,
      totalDiscounts,
      totalNetSubtotal,
      totalOrders,
      averageOrderValue,
      advisorBreakdown,
    };
  }

  async getSalesGoals(filters: FilterSalesGoalsDto) {
    const where: Prisma.SalesGoalWhereInput = {};
    if (filters.month !== undefined) where.month = filters.month;
    if (filters.year !== undefined) where.year = filters.year;
    if (filters.advisorId) where.advisorId = filters.advisorId;

    return this.prisma.salesGoal.findMany({
      where,
      include: {
        advisor: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
      orderBy: [{ year: 'asc' }, { month: 'asc' }],
    });
  }

  async upsertSalesGoal(dto: UpsertSalesGoalDto) {
    const { advisorId, month, year, targetAmount } = dto;
    return this.prisma.salesGoal.upsert({
      where: { advisorId_month_year: { advisorId, month, year } },
      update: { targetAmount },
      create: { advisorId, month, year, targetAmount },
      include: {
        advisor: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });
  }

  async deleteSalesGoal(id: string) {
    const goal = await this.prisma.salesGoal.findUnique({ where: { id } });
    if (!goal) throw new NotFoundException(`Sales goal with ID ${id} not found`);
    return this.prisma.salesGoal.delete({ where: { id } });
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
        sampleImageId: item.sampleImageId || undefined,
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

    const providedTaxRate = createOrderDto.taxRate !== undefined ? createOrderDto.taxRate : 0.19;
    const taxRate = new Prisma.Decimal(providedTaxRate);
    const tax = subtotal.mul(taxRate);
    const discountAmount = new Prisma.Decimal(0);

    const retefuenteRate = new Prisma.Decimal(createOrderDto.retefuenteRate ?? 0);
    const reteICARate = new Prisma.Decimal(createOrderDto.reteICARate ?? 0);
    const reteIVARate = new Prisma.Decimal(createOrderDto.reteIVARate ?? 0);
    const retefuenteAmount = subtotal.mul(retefuenteRate);
    const reteICAAmount = subtotal.mul(reteICARate);
    const reteIVAAmount = tax.mul(reteIVARate);

    const requiresColorProof = createOrderDto.requiresColorProof || false;
    const colorProofPrice = requiresColorProof && createOrderDto.colorProofPrice
      ? new Prisma.Decimal(createOrderDto.colorProofPrice)
      : new Prisma.Decimal(0);

    const rawTotal = subtotal
      .sub(retefuenteAmount)
      .sub(reteICAAmount)
      .add(tax)
      .sub(reteIVAAmount)
      .sub(discountAmount)
      .add(colorProofPrice);
    // Si hay retenciones el total debe ser exacto (sin redondeo comercial).
    const hasRetenciones =
      retefuenteAmount.gt(0) || reteICAAmount.gt(0) || reteIVAAmount.gt(0);
    const total = hasRetenciones ? rawTotal : applyColombianRounding(rawTotal);

    // Manejar pagos iniciales (uno o múltiples)
    let paidAmount = new Prisma.Decimal(0);
    let payments = undefined;

    const allInitialPayments: InitialPaymentDto[] = [
      ...(createOrderDto.initialPayment ? [createOrderDto.initialPayment] : []),
      ...(createOrderDto.initialPayments ?? []),
    ];

    // Buscar sesión activa una sola vez (se reutiliza en buildPayments)
    let activeSession: { id: string } | null = null;

    // Total de saldo a favor que se pretende aplicar en esta orden
    const creditBalanceTotal = allInitialPayments
      .filter((p) => p.paymentMethod === PaymentMethod.CREDIT_BALANCE)
      .reduce((sum, p) => sum.add(new Prisma.Decimal(p.amount)), new Prisma.Decimal(0));

    if (allInitialPayments.length > 0) {
      paidAmount = allInitialPayments.reduce(
        (sum, p) => sum.add(new Prisma.Decimal(p.amount)),
        new Prisma.Decimal(0),
      );

      // Nota: se permite que los pagos iniciales excedan el total.
      // El excedente queda como saldo a favor del cliente y podrá reembolsarse
      // mediante el flujo de RefundRequest.

      // Validar el saldo a favor ANTES de crear la orden: el consumo real se
      // registra después (necesita el id del pago), así que fallar aquí evita
      // dejar una orden creada con un saldo que el cliente no tiene.
      if (creditBalanceTotal.greaterThan(0)) {
        await this.creditBalanceService.assertEnoughCredit(
          createOrderDto.clientId,
          creditBalanceTotal,
        );
      }

      // 1. Buscar sesión activa
      activeSession = await this.prisma.cashSession.findFirst({
        where: { status: 'OPEN' },
        select: { id: true },
      });
    }

    // Helper: construye los datos de pagos generando nuevos receiptNumbers en cada llamada.
    // Se invoca al inicio de cada intento del bucle de reintento para que, ante una colisión
    // en receipt_number, el siguiente intento use un número fresco.
    const buildPayments = async () => {
      if (allInitialPayments.length === 0) return undefined;
      const paymentsToCreate = [];
      for (const p of allInitialPayments) {
        const paymentData: any = {
          amount: new Prisma.Decimal(p.amount),
          paymentMethod: p.paymentMethod,
          paymentDate: new Date(),
          reference: p.reference,
          notes: p.notes,
          bankEntity: p.bankEntity ?? null,
          receivedBy: { connect: { id: createdById } },
        };

        // El saldo a favor no es dinero que entre a caja: ese ingreso ya se
        // registró cuando el cliente sobrepagó la orden de origen. Generar un
        // movimiento aquí inflaría el arqueo.
        const movesCash = p.paymentMethod !== PaymentMethod.CREDIT_BALANCE;

        // Sin caja abierta el abono queda en cola: entra al arqueo cuando se
        // abra la próxima sesión, en vez de nacer huérfano para siempre.
        paymentData.pendingCashEntry = !activeSession && movesCash;

        if (activeSession && movesCash) {
          const receiptNumber = await this.consecutivesService.generateNumber('CASH_RECEIPT');
          paymentData.cashMovement = {
            create: {
              cashSessionId: activeSession.id,
              receiptNumber,
              movementType: 'INCOME',
              paymentMethod: p.paymentMethod || 'CASH',
              amount: new Prisma.Decimal(p.amount),
              description: `Abono a nueva orden (pendiente de número)`,
              referenceType: 'ORDER',
              performedById: createdById,
            }
          };
        }
        paymentsToCreate.push(paymentData);
      }
      return { create: paymentsToCreate };
    };

    const balance = total.sub(paidAmount);

    // Crear orden con items y pago inicial (en transacción)
    // Se implementa un mecanismo de reintento en caso de colisión de número de orden o
    // receipt_number (P2002). Los receiptNumbers se regeneran en cada intento.
    let newOrder;
    let attempts = 0;
    const maxAttempts = 3;
    let currentOrderNumber = orderNumber;

    while (attempts < maxAttempts) {
      // Generar receiptNumbers frescos en cada intento para evitar colisiones en reintentos
      payments = await buildPayments();
      try {
        newOrder = await this.ordersRepository.create({
          orderNumber: currentOrderNumber,
          orderDate: new Date(),
          deliveryDate: createOrderDto.deliveryDate
            ? new Date(createOrderDto.deliveryDate)
            : undefined,
          subtotal,
          taxRate,
          tax,
          retefuenteRate,
          reteICARate,
          reteIVARate,
          discountAmount,
          requiresColorProof,
          colorProofPrice,
          total,
          paidAmount,
          balance,
          notes: createOrderDto.notes,
          notesImageId: createOrderDto.notesImageId,
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
        break; // Éxito, salir del bucle
      } catch (error: any) {
        attempts++;

        if (error.code !== 'P2002' || attempts >= maxAttempts) {
          throw error;
        }

        // El driver de pg no expone `meta.target`; en su lugar la info está en driverAdapterError.
        // driverAdapterError es una instancia de Error por lo que .cause puede ser accesible
        // a través de la cadena de Error o como propiedad directa según la versión del adapter.
        const driverErr = error.meta?.driverAdapterError;
        const driverCause = driverErr?.cause ?? (driverErr as any)?.error?.cause;
        const constraintFields: string[] =
          (driverCause?.constraint?.fields as string[] | undefined) ??
          (error.meta?.target as string[] | undefined) ??
          [];

        // Fallback: parsear el mensaje original de pg para identificar la constraint
        const originalMessage: string =
          driverCause?.originalMessage ?? driverErr?.message ?? '';

        const target = JSON.stringify(error.meta?.target || '');

        const isOrderNumberCollision =
          constraintFields.includes('order_number') ||
          target.includes('order_number') ||
          target.includes('orders_order_number_key') ||
          originalMessage.includes('orders_order_number');

        const isReceiptNumberCollision =
          constraintFields.includes('receipt_number') ||
          originalMessage.includes('receipt_number') ||
          originalMessage.includes('cash_movements_receipt_number');

        if (isOrderNumberCollision) {
          // Sincronizar el contador de consecutivos y generar un nuevo número de orden
          await this.consecutivesService.syncCounter('ORDER');
          currentOrderNumber = await this.consecutivesService.generateNumber('ORDER');
          continue;
        }

        if (isReceiptNumberCollision) {
          // Sincronizar el contador de CASH_RECEIPT; los nuevos receiptNumbers
          // se generarán automáticamente al inicio del siguiente intento (buildPayments).
          await this.consecutivesService.syncCounter('CASH_RECEIPT');
          continue;
        }

        throw error; // Re-lanzar si no es una colisión conocida
      }
    }

    // Actualizar CashMovements creados en pagos iniciales para enlazarlos con la orden recién creada
    if (newOrder && payments) {
      const createdPayments = await this.prisma.payment.findMany({
        where: { orderId: newOrder.id, cashMovementId: { not: null } },
        select: { cashMovementId: true }
      });
      const movementIds = createdPayments.map(p => p.cashMovementId);
      if (movementIds.length > 0) {
        await this.prisma.cashMovement.updateMany({
          where: { id: { in: movementIds as string[] } },
          data: {
            referenceType: 'ORDER',
            referenceId: newOrder.id,
            description: `Abono a orden ${newOrder.orderNumber}`,
          }
        });
      }
    }

    // Consumir el saldo a favor de las OPs de origen. Se hace después de crear la
    // orden porque cada aplicación se ancla al pago que la consume.
    if (newOrder && creditBalanceTotal.greaterThan(0)) {
      const creditPayments = await this.prisma.payment.findMany({
        where: { orderId: newOrder.id, paymentMethod: PaymentMethod.CREDIT_BALANCE },
        select: { id: true, amount: true },
      });

      await this.prisma.$transaction(async (tx) => {
        for (const creditPayment of creditPayments) {
          await this.creditBalanceService.applyCredit(tx, {
            clientId: createOrderDto.clientId,
            paymentId: creditPayment.id,
            amount: creditPayment.amount,
            targetOrderId: newOrder.id,
          });
        }
      });
    }

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

    // Ejecutar ambas verificaciones post-creación en paralelo para no perder ninguna
    // aunque una de ellas sea verdadera (evitar early-return que omita la otra)
    let needsRefetch = false;

    // Verificar si el anticipo requiere aprobación (usuario no-admin/no-caja).
    // Todos los pagos deben ser autorizados por Caja, incluido CRÉDITO: un pago
    // a crédito normalmente entra con monto 0 (no suma a paidAmount), por lo que
    // debe considerarse explícitamente además del monto pagado.
    const hasCreditInitialPayment = allInitialPayments.some(
      (p) => p.paymentMethod === PaymentMethod.CREDIT,
    );
    if (
      newOrder &&
      allInitialPayments.length > 0 &&
      (paidAmount.greaterThan(0) || hasCreditInitialPayment)
    ) {
      const approvalCheck = await this.advancePaymentApprovalsService.requiresApproval(createdById);

      if (approvalCheck.required) {
        // Buscar todos los pagos creados (en orden de creación)
        const createdPayments = await this.prisma.payment.findMany({
          where: { orderId: newOrder.id },
          orderBy: { createdAt: 'asc' },
        });

        // Crear una solicitud de aprobación + notificación WA por cada anticipo
        for (let idx = 0; idx < createdPayments.length; idx++) {
          const isCredit = createdPayments[idx].paymentMethod === PaymentMethod.CREDIT;
          const base = isCredit ? 'crédito' : 'anticipo';
          const paymentLabel =
            createdPayments.length > 1 ? `${base} ${idx + 1}` : base;

          await this.advancePaymentApprovalsService.createFromOrderCreation(
            createdById,
            newOrder.id,
            createdPayments[idx].id,
            paymentLabel,
          );
          needsRefetch = true;
        }
      }
    }

    // Verificar si el cliente pertenece a otro asesor y se requiere autorización
    if (newOrder) {
      const ownershipCheck = await this.clientOwnershipAuthRequestsService.requiresAuth(
        createdById,
        createOrderDto.clientId,
      );

      if (ownershipCheck.required && ownershipCheck.advisorId) {
        await this.clientOwnershipAuthRequestsService.createFromOrderCreation(
          createdById,
          newOrder.id,
          ownershipCheck.advisorId,
        );
        needsRefetch = true;
      }
    }

    // Re-fetch una sola vez si cualquiera de los checks creó un registro pendiente
    if (needsRefetch && newOrder) {
      return this.findOne(newOrder.id);
    }

    return newOrder;
  }

  async update(id: string, updateOrderDto: UpdateOrderDto, userId: string) {
    const oldOrder = await this.findOne(id);
    this.assertNotAnulado(oldOrder, 'editar orden');

    // Si cambia o se elimina la imagen de observaciones, borrar la anterior del storage
    if (
      updateOrderDto.notesImageId !== undefined &&
      oldOrder.notesImageId &&
      oldOrder.notesImageId !== updateOrderDto.notesImageId
    ) {
      try {
        await this.storageService.deleteFile(oldOrder.notesImageId);
      } catch (error) {
        this.logger.error(
          `Failed to delete previous notes image ${oldOrder.notesImageId}:`,
          error,
        );
      }
    }

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
            ...(updateOrderDto.notesImageId !== undefined && {
              notesImageId: updateOrderDto.notesImageId,
            }),
            ...(updateOrderDto.status && {
              status: updateOrderDto.status,
            }),
            ...(updateOrderDto.commercialChannelId && {
              commercialChannel: { connect: { id: updateOrderDto.commercialChannelId } },
            }),
            ...(updateOrderDto.requiresColorProof !== undefined && {
              requiresColorProof: updateOrderDto.requiresColorProof,
            }),
            ...(updateOrderDto.colorProofPrice !== undefined && {
              colorProofPrice: new Prisma.Decimal(updateOrderDto.colorProofPrice),
            }),
            ...(updateOrderDto.taxRate !== undefined && {
              taxRate: new Prisma.Decimal(updateOrderDto.taxRate),
            }),
            ...(updateOrderDto.retefuenteRate !== undefined && {
              retefuenteRate: new Prisma.Decimal(updateOrderDto.retefuenteRate),
            }),
            ...(updateOrderDto.reteICARate !== undefined && {
              reteICARate: new Prisma.Decimal(updateOrderDto.reteICARate),
            }),
            ...(updateOrderDto.reteIVARate !== undefined && {
              reteIVARate: new Prisma.Decimal(updateOrderDto.reteIVARate),
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
                sampleImageId: item.sampleImageId || undefined,
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
                  sampleImageId: item.sampleImageId || undefined,
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
            bankEntity: updateOrderDto.initialPayment.bankEntity ?? null,
            receivedById: userId,
          };

          const touchedPayment = firstPayment
            ? await tx.payment.update({
                where: { id: firstPayment.id },
                data: paymentData,
                select: { id: true },
              })
            : await tx.payment.create({
                data: {
                  ...paymentData,
                  orderId: id,
                  paymentDate: new Date(),
                },
                select: { id: true },
              });

          // Mantener la caja alineada con el pago. Esta rama no lo hacía, así
          // que un abono agregado al editar la OP nacía huérfano (nunca
          // aparecía en el historial de caja) y editar el monto de un abono ya
          // ingresado dejaba el movimiento con la cifra vieja, descuadrando el
          // arqueo. El saldo a favor se excluye: ese dinero ya entró a caja en
          // la OP de origen.
          const isCreditBalancePayment =
            paymentData.paymentMethod === PaymentMethod.CREDIT_BALANCE;

          if (!firstPayment) {
            // Pago nuevo: mismo tratamiento que en `addPayment`.
            if (!isCreditBalancePayment) {
              const activeSession = await tx.cashSession.findFirst({
                where: { status: 'OPEN' },
                select: { id: true },
              });

              if (activeSession) {
                const receiptNumber =
                  await this.consecutivesService.generateNumber('CASH_RECEIPT');
                const movement = await tx.cashMovement.create({
                  data: {
                    cashSessionId: activeSession.id,
                    receiptNumber,
                    movementType: 'INCOME',
                    paymentMethod: paymentData.paymentMethod || 'CASH',
                    amount: paymentData.amount,
                    description: `Abono a Orden ${oldOrder.orderNumber}`,
                    referenceType: 'ORDER',
                    referenceId: id,
                    performedById: userId,
                  },
                  select: { id: true },
                });

                await tx.payment.update({
                  where: { id: touchedPayment.id },
                  data: { cashMovementId: movement.id },
                });
              } else {
                // Sin caja abierta: a la cola, para entrar al abrir la próxima.
                await tx.payment.update({
                  where: { id: touchedPayment.id },
                  data: { pendingCashEntry: true },
                });
              }
            }
          } else if (firstPayment.cashMovementId) {
            // El pago ya estaba en caja: o se sincroniza el movimiento con los
            // datos nuevos, o se anula si pasó a saldo a favor (ese ingreso
            // deja de existir como entrada de caja).
            if (isCreditBalancePayment) {
              await tx.cashMovement.update({
                where: { id: firstPayment.cashMovementId },
                data: {
                  isVoided: true,
                  voidedById: userId,
                  voidedAt: new Date(),
                  voidReason:
                    'El abono pasó a saldo a favor: el ingreso ya se registró en la OP de origen',
                },
              });
              await tx.payment.update({
                where: { id: touchedPayment.id },
                data: { cashMovementId: null },
              });
            } else {
              await tx.cashMovement.update({
                where: { id: firstPayment.cashMovementId },
                data: {
                  amount: paymentData.amount,
                  paymentMethod: paymentData.paymentMethod || 'CASH',
                },
              });
            }
          }

          // Reajustar el consumo de saldo a favor: el pago pudo pasar a
          // CREDIT_BALANCE, dejar de serlo o cambiar de monto.
          await this.creditBalanceService.resyncCredit(tx, {
            paymentId: touchedPayment.id,
            clientId: oldOrder.clientId,
            targetOrderId: id,
            amount: paymentData.amount,
            isCreditBalance:
              paymentData.paymentMethod === PaymentMethod.CREDIT_BALANCE,
          });
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

      // Verificar si el anticipo fue AGREGADO en esta edición (transición 0 → >0)
      const newPaymentAmount = new Prisma.Decimal(updateOrderDto.initialPayment?.amount ?? 0);
      const hadNoPreviousPayment = new Prisma.Decimal(oldOrder.paidAmount).equals(0);
      const hasNoPendingApproval = oldOrder.advancePaymentStatus !== EditRequestStatus.PENDING;

      this.logger.debug(
        `[update] anticipo check — initialPayment: ${JSON.stringify(updateOrderDto.initialPayment)}, ` +
        `newPaymentAmount: ${newPaymentAmount}, hadNoPreviousPayment: ${hadNoPreviousPayment}, ` +
        `hasNoPendingApproval: ${hasNoPendingApproval}, oldPaidAmount: ${oldOrder.paidAmount}, ` +
        `oldAdvanceStatus: ${oldOrder.advancePaymentStatus}`,
      );

      // Crédito también debe ser autorizado por Caja aunque no sume monto pagado
      const isCreditInitialPayment =
        updateOrderDto.initialPayment?.paymentMethod === PaymentMethod.CREDIT;
      if (
        updateOrderDto.initialPayment &&
        (newPaymentAmount.greaterThan(0) || isCreditInitialPayment) &&
        hadNoPreviousPayment &&
        hasNoPendingApproval
      ) {
        const approvalCheck = await this.advancePaymentApprovalsService.requiresApproval(userId);
        this.logger.debug(`[update] requiresApproval: ${JSON.stringify(approvalCheck)}`);

        // Todo pago requiere autorización de Caja (sin bypass por rol): se crea
        // la solicitud para el último pago agregado en esta edición.
        if (approvalCheck.required) {
          const payment = await this.prisma.payment.findFirst({
            where: { orderId: id },
            orderBy: { createdAt: 'desc' },
          });
          this.logger.debug(`[update] payment found: ${payment?.id}`);

          if (payment) {
            await this.advancePaymentApprovalsService.createFromOrderCreation(
              userId,
              id,
              payment.id,
            );
            return this.findOne(id);
          }
        }
      }

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
      ...(updateOrderDto.notesImageId !== undefined && {
        notesImageId: updateOrderDto.notesImageId,
      }),
      ...(updateOrderDto.status && {
        status: updateOrderDto.status,
      }),
      ...(updateOrderDto.commercialChannelId && {
        commercialChannel: { connect: { id: updateOrderDto.commercialChannelId } },
      }),
      ...(updateOrderDto.requiresColorProof !== undefined && {
        requiresColorProof: updateOrderDto.requiresColorProof,
      }),
      ...(updateOrderDto.colorProofPrice !== undefined && {
        colorProofPrice: new Prisma.Decimal(updateOrderDto.colorProofPrice),
      }),
      ...(updateOrderDto.taxRate !== undefined && {
        taxRate: new Prisma.Decimal(updateOrderDto.taxRate),
      }),
      ...(updateOrderDto.retefuenteRate !== undefined && {
        retefuenteRate: new Prisma.Decimal(updateOrderDto.retefuenteRate),
      }),
      ...(updateOrderDto.reteICARate !== undefined && {
        reteICARate: new Prisma.Decimal(updateOrderDto.reteICARate),
      }),
      ...(updateOrderDto.reteIVARate !== undefined && {
        reteIVARate: new Prisma.Decimal(updateOrderDto.reteIVARate),
      }),
    });

    // Si se actualizó el precio de la prueba de color, tasa de impuesto o retenciones, recalcular totales
    if (
      updateOrderDto.colorProofPrice !== undefined ||
      updateOrderDto.requiresColorProof !== undefined ||
      updateOrderDto.taxRate !== undefined ||
      updateOrderDto.retefuenteRate !== undefined ||
      updateOrderDto.reteICARate !== undefined ||
      updateOrderDto.reteIVARate !== undefined
    ) {
      await this.recalculateOrderTotals(id, this.prisma);
    }

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

    // No-op si el estado es el mismo
    if (order.status === status) {
      return order;
    }

    // Fast-path: ANULADO omite checks de anticipo/descuento/propiedad
    // pero requiere autorización administrativa para usuarios no-admin
    if (status === OrderStatus.ANULADO) {
      if (!isValidTransition(order.status as OrderStatus, status)) {
        throw new BadRequestException(
          `No se puede anular una orden en estado ${order.status}.`,
        );
      }

      const authCheck = await this.statusChangeRequestsService.requiresAuthorization(
        id,
        status,
        userId,
      );

      if (authCheck.required) {
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

        await this.statusChangeRequestsService.consumeApprovedRequest(id, userId, status);
      }

      await this.ordersRepository.updateStatus(id, status);
      const updatedOrder = await this.findOne(id);
      this.auditLogsService.logOrderChange('UPDATE', id, order, updatedOrder, userId);
      return updatedOrder;
    }

    // Bloquear cualquier cambio de estado desde ANULADO
    if (order.status === OrderStatus.ANULADO) {
      throw new ForbiddenException(
        'Esta orden está ANULADA. No se pueden realizar cambios de estado.',
      );
    }

    // Bloquear cambio de estado si el anticipo está pendiente de aprobación
    if (order.advancePaymentStatus === 'PENDING') {
      throw new BadRequestException(
        'No se puede cambiar el estado de esta orden porque tiene un anticipo pendiente de aprobación por Caja.',
      );
    }

    // Bloquear cambio de estado si el anticipo fue rechazado
    if (order.advancePaymentStatus === 'REJECTED') {
      throw new BadRequestException(
        'No se puede cambiar el estado de esta orden porque el anticipo fue rechazado.',
      );
    }

    // Bloquear cambio de estado si la autorización de propiedad de cliente está pendiente
    if (order.clientOwnershipAuthStatus === 'PENDING') {
      throw new BadRequestException(
        'No se puede cambiar el estado de esta orden porque la autorización de propiedad del cliente está pendiente de aprobación por un administrador.',
      );
    }

    // Bloquear cambio de estado si la autorización de propiedad de cliente fue rechazada
    if (order.clientOwnershipAuthStatus === 'REJECTED') {
      throw new BadRequestException(
        'No se puede cambiar el estado de esta orden porque la autorización de propiedad del cliente fue rechazada. Contacte al administrador.',
      );
    }

    // Validar que la transición sea permitida por el flujo secuencial
    if (!isValidTransition(order.status as OrderStatus, status)) {
      const validNext = getValidNextStatuses(order.status as OrderStatus);
      const validLabels = validNext.length > 0
        ? validNext.join(', ')
        : 'ninguno (estado terminal)';
      throw new BadRequestException(
        `Transición de estado no permitida: ${order.status} → ${status}. ` +
        `Las transiciones válidas desde ${order.status} son: ${validLabels}.`,
      );
    }

    // Validación de saldo para PAID
    if (status === OrderStatus.PAID) {
      const balance = new Prisma.Decimal(order.balance);

      if (balance.greaterThan(0)) {
        throw new BadRequestException(
          `No se puede cambiar al estado PAGADA con saldo pendiente. ` +
          `Saldo actual: $${order.balance}. ` +
          `Use el estado DELIVERED_ON_CREDIT (Entregado a Crédito) o complete los pagos primero.`,
        );
      }
    }

    // Autorización para DELIVERED_ON_CREDIT (usuarios no-admin necesitan aprobación)
    if (status === OrderStatus.DELIVERED_ON_CREDIT) {
      const authCheck = await this.statusChangeRequestsService.requiresAuthorization(
        id,
        status,
        userId,
      );

      if (authCheck.required) {
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

        await this.statusChangeRequestsService.consumeApprovedRequest(
          id,
          userId,
          status,
        );
      }
    }

    await this.ordersRepository.updateStatus(id, status);

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
    this.assertNotAnulado(order, 'registrar factura electrónica');

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
    this.assertNotAnulado(order, 'agregar ítem');

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
    this.assertNotAnulado(order, 'modificar ítem');

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
    this.assertNotAnulado(order, 'eliminar ítem');

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
    this.assertNotAnulado(order, 'registrar pago');

    // Solo se pueden agregar pagos a órdenes CONFIRMED en adelante
    const allowedStatuses: OrderStatus[] = [
      OrderStatus.CONFIRMED,
      OrderStatus.IN_PRODUCTION,
      OrderStatus.READY,
      OrderStatus.DELIVERED,
      OrderStatus.DELIVERED_ON_CREDIT,
      OrderStatus.PAID,
      OrderStatus.WARRANTY,
    ];

    if (!allowedStatuses.includes(order.status)) {
      throw new BadRequestException(
        'Payments can only be added to CONFIRMED or later status orders',
      );
    }

    const paymentAmount = new Prisma.Decimal(createPaymentDto.amount);
    const isCreditBalance =
      createPaymentDto.paymentMethod === PaymentMethod.CREDIT_BALANCE;

    // Buscar sesión de caja abierta activa
    const activeSession = await this.prisma.cashSession.findFirst({
      where: { status: 'OPEN' },
      select: { id: true },
    });

    // Nota: se permite que el pago exceda el saldo pendiente.
    // El excedente queda como "saldo a favor" (paidAmount > total → balance negativo)
    // y puede devolverse al cliente mediante el flujo de RefundRequest.

    // Usar transacción simple y luego obtener el pago completo
    const paymentId = await this.prisma.$transaction(async (tx) => {
      // Si hay sesión de caja, generar un número de recibo e insertar el movimiento
      // de caja. El saldo a favor se excluye: ese dinero ya entró a caja cuando el
      // cliente sobrepagó la orden de origen.
      let cashMovementId: string | undefined = undefined;
      if (activeSession && !isCreditBalance) {
        const receiptNumber = await this.consecutivesService.generateNumber('CASH_RECEIPT');
        const movement = await tx.cashMovement.create({
          data: {
            cashSessionId: activeSession.id,
            receiptNumber,
            movementType: 'INCOME',
            paymentMethod: createPaymentDto.paymentMethod || 'CASH',
            amount: paymentAmount,
            description: `Abono a Orden ${order.orderNumber}`,
            referenceType: 'ORDER',
            referenceId: orderId,
            performedById: receivedById,
          },
          select: { id: true },
        });
        cashMovementId = movement.id;
      }

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
          bankEntity: createPaymentDto.bankEntity ?? null,
          receiptFileId: createPaymentDto.receiptFileId,
          receivedById,
          cashMovementId, // Vincular movimiento de caja si se creó
          // Sin caja abierta el abono no puede generar movimiento ahora, pero
          // tampoco debe perderse: queda en cola y entra al abrir la próxima
          // sesión. El saldo a favor se excluye (ya entró en la OP de origen).
          pendingCashEntry: !activeSession && !isCreditBalance,
        },
        select: {
          id: true,
        },
      });

      // Consumir el saldo a favor del cliente (valida disponibilidad dentro de la
      // transacción y descuenta el excedente de las OPs de origen).
      if (isCreditBalance) {
        await this.creditBalanceService.applyCredit(tx, {
          clientId: order.clientId,
          paymentId: payment.id,
          amount: paymentAmount,
          targetOrderId: orderId,
        });
      }

      // Actualizar paidAmount y balance
      const newPaidAmount = new Prisma.Decimal(order.paidAmount).add(
        paymentAmount,
      );
      const newBalance = computeOrderBalance(
        order.total,
        newPaidAmount,
        order.appliedCreditAmount,
      );

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
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      select: {
        id: true,
        amount: true,
        paymentMethod: true,
        paymentDate: true,
        reference: true,
        notes: true,
        bankEntity: true,
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

    // Verificar si el pago requiere aprobación de Caja (usuario sin permiso approve_advance_payments)
    const approvalCheck = await this.advancePaymentApprovalsService.requiresApproval(receivedById);
    if (approvalCheck.required) {
      await this.advancePaymentApprovalsService.createFromOrderCreation(
        receivedById,
        orderId,
        paymentId,
        'pago',
      );
    }

    return payment;
  }

  async getPayments(orderId: string) {
    // Verificar que la orden existe
    await this.findOne(orderId);

    return this.ordersRepository.findPaymentsByOrderId(orderId);
  }

  /**
   * Editar un pago existente de una orden.
   * Quien tenga `approve_payment_edits` aplica el cambio directamente.
   * El resto genera una solicitud PENDING que el admin debe autorizar:
   * el pago NO se modifica (ni el saldo) hasta la aprobación.
   */
  async updatePayment(
    orderId: string,
    paymentId: string,
    updatePaymentDto: UpdatePaymentDto,
    userId: string,
    receiptFile?: Express.Multer.File,
  ) {
    const order = await this.findOne(orderId);
    this.assertNotAnulado(order, 'editar pago');

    const payment = await this.prisma.payment.findFirst({
      where: { id: paymentId, orderId },
      select: { id: true, receiptFileId: true },
    });
    if (!payment) {
      throw new NotFoundException(
        `Pago con id ${paymentId} no encontrado en la orden`,
      );
    }

    // ¿El usuario requiere aprobación del admin?
    const approvalCheck =
      await this.paymentEditApprovalsService.requiresApproval(userId);

    if (approvalCheck.required) {
      // Si adjuntó comprobante, súbelo a storage SIN enlazarlo al pago todavía:
      // queda como payload pendiente hasta que el admin apruebe.
      let newReceiptFileId: string | undefined;
      if (receiptFile) {
        const uploaded = await this.storageService.uploadFile(receiptFile, {
          entityType: 'payment',
          entityId: paymentId,
          userId,
        });
        newReceiptFileId = uploaded.id;
      }

      const request = await this.paymentEditApprovalsService.createRequest(
        orderId,
        paymentId,
        userId,
        {
          amount: updatePaymentDto.amount,
          paymentMethod: updatePaymentDto.paymentMethod,
          paymentDate: updatePaymentDto.paymentDate,
          reference: updatePaymentDto.reference,
          notes: updatePaymentDto.notes,
          reason: updatePaymentDto.reason,
          oldReceiptFileId: payment.receiptFileId,
          newReceiptFileId,
        },
      );
      return {
        status: 'PENDING_APPROVAL',
        approvalId: request?.id,
        message:
          approvalCheck.reason ??
          'La edición del pago fue enviada para aprobación del administrador',
      };
    }

    // Usuario con permiso: aplicar el cambio directamente
    // El rastro sale de la transacción en vez de mutar una variable externa:
    // así el audit log solo se escribe si la edición realmente se confirmó.
    const movementEditedAfterClose = await this.prisma.$transaction(async (tx) => {
      let editedAfterClose: MovementEditedAfterClose | null = null;
      const paymentData: Prisma.PaymentUpdateInput = {};
      if (updatePaymentDto.amount !== undefined)
        paymentData.amount = new Prisma.Decimal(updatePaymentDto.amount);
      if (updatePaymentDto.paymentMethod !== undefined)
        paymentData.paymentMethod = updatePaymentDto.paymentMethod;
      if (updatePaymentDto.paymentDate !== undefined)
        paymentData.paymentDate = new Date(updatePaymentDto.paymentDate);
      if (updatePaymentDto.reference !== undefined)
        paymentData.reference = updatePaymentDto.reference;
      if (updatePaymentDto.notes !== undefined)
        paymentData.notes = updatePaymentDto.notes;
      if (updatePaymentDto.bankEntity !== undefined)
        paymentData.bankEntity = updatePaymentDto.bankEntity;

      const updated = await tx.payment.update({
        where: { id: paymentId },
        data: paymentData,
        select: {
          id: true,
          amount: true,
          paymentMethod: true,
          cashMovementId: true,
        },
      });

      // Ajustar movimiento de caja vinculado.
      //
      // Si la sesión de ese movimiento ya está cerrada, editarlo altera un
      // arqueo firmado: `closingAmount`/`systemBalance`/`discrepancy` quedaron
      // congelados al cerrar y no se recalculan. Se permite igual (decisión de
      // negocio: corregir un monto mal digitado no puede quedar bloqueado para
      // siempre), pero **el cambio no puede ser silencioso**: se anota en la
      // descripción del movimiento —que es lo que se ve en el arqueo y en la
      // exportación de la sesión— y se deja registro en el audit log.
      if (updated.cashMovementId) {
        const movement = await tx.cashMovement.findUnique({
          where: { id: updated.cashMovementId },
          select: {
            id: true,
            amount: true,
            paymentMethod: true,
            description: true,
            cashSession: { select: { id: true, status: true } },
          },
        });

        const sessionClosed = movement?.cashSession?.status === 'CLOSED';
        const amountChanged =
          movement != null && !movement.amount.equals(updated.amount);

        const movementData: Prisma.CashMovementUpdateInput = {
          amount: updated.amount,
          paymentMethod: updated.paymentMethod,
        };

        if (movement && sessionClosed && amountChanged) {
          const antes = movement.amount.toString();
          const ahora = updated.amount.toString();
          const fecha = new Date().toISOString().slice(0, 10);
          movementData.description =
            `${movement.description} [Editado el ${fecha} tras el cierre: ` +
            `${antes} → ${ahora}]`;
        }

        await tx.cashMovement.update({
          where: { id: updated.cashMovementId },
          data: movementData,
        });

        if (movement && sessionClosed) {
          editedAfterClose = {
            movementId: movement.id,
            sessionId: movement.cashSession!.id,
            oldAmount: movement.amount.toString(),
            newAmount: updated.amount.toString(),
            oldPaymentMethod: movement.paymentMethod,
            newPaymentMethod: updated.paymentMethod,
          };
        }
      }

      // Reajustar el consumo de saldo a favor si el pago editado lo usa (o dejó
      // de usarlo): se libera lo aplicado antes y se vuelve a tomar con el monto
      // vigente.
      await this.creditBalanceService.resyncCredit(tx, {
        paymentId,
        clientId: order.clientId,
        targetOrderId: orderId,
        amount: updated.amount,
        isCreditBalance:
          updated.paymentMethod === PaymentMethod.CREDIT_BALANCE,
      });

      // Recalcular paidAmount/balance (el total de la orden no cambia)
      const payments = await tx.payment.findMany({
        where: { orderId },
        select: { amount: true },
      });
      let paymentsTotal = new Prisma.Decimal(0);
      for (const p of payments) {
        paymentsTotal = paymentsTotal.add(p.amount);
      }
      const current = await tx.order.findUnique({
        where: { id: orderId },
        select: {
          total: true,
          appliedCreditAmount: true,
          refundedAmount: true,
        },
      });
      const paidAmount = computeNetPaidAmount(
        paymentsTotal,
        current?.refundedAmount,
      );
      await tx.order.update({
        where: { id: orderId },
        data: {
          paidAmount,
          balance: computeOrderBalance(
            current?.total ?? order.total,
            paidAmount,
            current?.appliedCreditAmount,
          ),
        },
      });

      return editedAfterClose;
    });

    // Rastro del arqueo alterado. Va fuera de la transacción y sin await
    // bloqueante: es evidencia, no puede tumbar la edición si falla.
    if (movementEditedAfterClose) {
      this.logger.warn(
        `Movimiento ${movementEditedAfterClose.movementId} de la sesión de caja ` +
        `${movementEditedAfterClose.sessionId} (CERRADA) fue modificado al editar ` +
        `el pago ${paymentId}: ${movementEditedAfterClose.oldAmount} → ` +
        `${movementEditedAfterClose.newAmount}. El arqueo de esa sesión ya no ` +
        `refleja sus movimientos.`,
      );
      this.auditLogsService
        .logUpdate(
          'CashMovement',
          movementEditedAfterClose.movementId,
          {
            amount: movementEditedAfterClose.oldAmount,
            paymentMethod: movementEditedAfterClose.oldPaymentMethod,
          },
          {
            amount: movementEditedAfterClose.newAmount,
            paymentMethod: movementEditedAfterClose.newPaymentMethod,
            editedAfterSessionClose: true,
            cashSessionId: movementEditedAfterClose.sessionId,
            reason: `Edición del pago ${paymentId} sobre una sesión de caja cerrada`,
          },
          userId,
        )
        .catch(() => {});
    }

    // Reemplazar el comprobante si se adjuntó uno nuevo (fuera de la txn)
    if (receiptFile) {
      if (payment.receiptFileId) {
        await this.storageService.deleteFile(payment.receiptFileId, userId);
      }
      const uploaded = await this.storageService.uploadFile(receiptFile, {
        entityType: 'payment',
        entityId: paymentId,
        userId,
      });
      await this.prisma.payment.update({
        where: { id: paymentId },
        data: { receiptFileId: uploaded.id },
      });
    }

    return this.prisma.payment.findUnique({
      where: { id: paymentId },
      select: {
        id: true,
        amount: true,
        paymentMethod: true,
        paymentDate: true,
        reference: true,
        notes: true,
        bankEntity: true,
        receiptFileId: true,
        createdAt: true,
        receivedBy: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
      },
    });
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

    // Obtener tasas de la orden
    const order = await tx.order.findUnique({
      where: { id: orderId },
      select: {
        taxRate: true,
        requiresColorProof: true,
        colorProofPrice: true,
        retefuenteRate: true,
        reteICARate: true,
        reteIVARate: true,
        appliedCreditAmount: true,
        refundedAmount: true,
      },
    });

    const taxRate = order?.taxRate ?? new Prisma.Decimal(0.19);
    const tax = subtotal.mul(taxRate);

    const retefuenteRate = order?.retefuenteRate ?? new Prisma.Decimal(0);
    const reteICARate = order?.reteICARate ?? new Prisma.Decimal(0);
    const reteIVARate = order?.reteIVARate ?? new Prisma.Decimal(0);
    const retefuenteAmount = subtotal.mul(retefuenteRate);
    const reteICAAmount = subtotal.mul(reteICARate);
    const reteIVAAmount = tax.mul(reteIVARate);

    // Calcular discountAmount sumando todos los descuentos
    const discounts = await tx.orderDiscount.findMany({
      where: { orderId },
      select: { amount: true },
    });

    let discountAmount = new Prisma.Decimal(0);
    for (const discount of discounts) {
      discountAmount = discountAmount.add(discount.amount);
    }

    const colorProofPrice = order?.requiresColorProof && order?.colorProofPrice
      ? new Prisma.Decimal(order.colorProofPrice)
      : new Prisma.Decimal(0);

    const rawTotal = subtotal
      .sub(retefuenteAmount)
      .sub(reteICAAmount)
      .add(tax)
      .sub(reteIVAAmount)
      .sub(discountAmount)
      .add(colorProofPrice);
    // Si hay retenciones el total debe ser exacto (sin redondeo comercial).
    const hasRetenciones =
      retefuenteAmount.gt(0) || reteICAAmount.gt(0) || reteIVAAmount.gt(0);
    const total = hasRetenciones ? rawTotal : applyColombianRounding(rawTotal);

    // Calcular paidAmount sumando todos los pagos, neto de lo ya devuelto:
    // los Payment no se borran al aprobar una devolución.
    const payments = await tx.payment.findMany({
      where: { orderId },
      select: { amount: true },
    });

    let paymentsTotal = new Prisma.Decimal(0);
    for (const payment of payments) {
      paymentsTotal = paymentsTotal.add(payment.amount);
    }

    const paidAmount = computeNetPaidAmount(paymentsTotal, order?.refundedAmount);

    // El saldo a favor ya aplicado a otras OPs no vuelve a contar como excedente
    // aunque el total cambie por una edición de ítems.
    const balance = computeOrderBalance(
      total,
      paidAmount,
      order?.appliedCreditAmount,
    );

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
        appliedCreditAmount: true,
        refundedAmount: true,
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


  // ========== ITEM SAMPLE IMAGE MANAGEMENT ==========

  async uploadItemSampleImage(
    orderId: string,
    itemId: string,
    file: Express.Multer.File,
    userId: string,
  ) {
    // Verify order exists
    await this.findOne(orderId);

    // Verify item belongs to this order
    const item = await this.prisma.orderItem.findFirst({
      where: {
        id: itemId,
        orderId: orderId,
      },
    });

    if (!item) {
      throw new NotFoundException(
        `Order item with ID ${itemId} not found in order ${orderId}`,
      );
    }

    // If item already has a sample image, delete it first
    if (item.sampleImageId) {
      try {
        await this.storageService.deleteFile(item.sampleImageId);
      } catch (error) {
        this.logger.error(
          `Failed to delete existing sample image ${item.sampleImageId}:`,
          error,
        );
      }
    }

    // Upload new image
    const uploadedFile = await this.storageService.uploadFile(file, {
      entityType: 'order-item',
      entityId: itemId,
      userId,
    });

    // Update order item with new image ID
    await this.prisma.orderItem.update({
      where: { id: itemId },
      data: { sampleImageId: uploadedFile.id },
    });

    return uploadedFile;
  }

  async deleteItemSampleImage(orderId: string, itemId: string) {
    // Verify order exists
    await this.findOne(orderId);

    // Verify item belongs to this order
    const item = await this.prisma.orderItem.findFirst({
      where: {
        id: itemId,
        orderId: orderId,
      },
    });

    if (!item) {
      throw new NotFoundException(
        `Order item with ID ${itemId} not found in order ${orderId}`,
      );
    }

    if (!item.sampleImageId) {
      throw new BadRequestException('Order item does not have a sample image');
    }

    // Delete file from storage
    await this.storageService.deleteFile(item.sampleImageId);

    // Remove image reference from quote item
    await this.prisma.orderItem.update({
      where: { id: itemId },
      data: { sampleImageId: null },
    });

    return { message: 'Sample image deleted successfully' };
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
    this.assertNotAnulado(order, 'aplicar descuento');

    // Solo se pueden aplicar descuentos a órdenes CONFIRMED en adelante
    const allowedStatuses: OrderStatus[] = [
      OrderStatus.CONFIRMED,
      OrderStatus.IN_PRODUCTION,
      OrderStatus.READY,
      OrderStatus.DELIVERED,
      OrderStatus.DELIVERED_ON_CREDIT,
      OrderStatus.PAID,
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

    // Verificar si el descuento requiere aprobación (usuario sin permiso approve_discounts)
    const discountApprovalCheck = await this.discountApprovalsService.requiresApproval(appliedById);
    if (discountApprovalCheck.required) {
      await this.discountApprovalsService.createFromDiscountApplication(
        appliedById,
        orderId,
        discountId,
      );
    }

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

  /**
   * Historial unificado de aprobaciones y solicitudes de autorización de una OP.
   *
   * Consolida en una sola lista cronológica las distintas solicitudes de
   * autorización asociadas a la orden: anticipos, descuentos, propiedad de
   * cliente, edición de pagos y solicitudes de edición general. Cada registro
   * se normaliza a una forma común para poder renderizarse en un timeline.
   */
  async getAuthorizationHistory(orderId: string) {
    // Verificar que la orden existe
    await this.findOne(orderId);

    const USER_SELECT = {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
    } as const;

    const [advances, discounts, clientOwnership, paymentEdits, editRequests] =
      await Promise.all([
        this.prisma.advancePaymentApproval.findMany({
          where: { orderId },
          include: {
            requestedBy: { select: USER_SELECT },
            reviewedBy: { select: USER_SELECT },
          },
        }),
        this.prisma.discountApproval.findMany({
          where: { orderId },
          include: {
            requestedBy: { select: USER_SELECT },
            reviewedBy: { select: USER_SELECT },
            discount: { select: { amount: true, reason: true } },
          },
        }),
        this.prisma.clientOwnershipAuthRequest.findMany({
          where: { orderId },
          include: {
            requestedBy: { select: USER_SELECT },
            reviewedBy: { select: USER_SELECT },
            advisor: { select: USER_SELECT },
          },
        }),
        this.prisma.paymentEditApproval.findMany({
          where: { orderId },
          include: {
            requestedBy: { select: USER_SELECT },
            reviewedBy: { select: USER_SELECT },
          },
        }),
        this.prisma.orderEditRequest.findMany({
          where: { orderId },
          include: {
            requestedBy: { select: USER_SELECT },
            reviewedBy: { select: USER_SELECT },
          },
        }),
      ]);

    const events: AuthorizationHistoryEvent[] = [
      ...advances.map((a) => ({
        id: a.id,
        type: 'ADVANCE_PAYMENT' as const,
        status: a.status,
        reason: a.reason,
        amount: a.paymentAmount ? a.paymentAmount.toString() : null,
        advisor: null,
        createdAt: a.createdAt,
        reviewedAt: a.reviewedAt,
        reviewNotes: a.reviewNotes,
        requestedBy: a.requestedBy,
        reviewedBy: a.reviewedBy,
      })),
      ...discounts.map((d) => ({
        id: d.id,
        type: 'DISCOUNT' as const,
        status: d.status,
        reason: d.discount?.reason ?? null,
        amount: d.discount?.amount ? d.discount.amount.toString() : null,
        advisor: null,
        createdAt: d.createdAt,
        reviewedAt: d.reviewedAt,
        reviewNotes: d.reviewNotes,
        requestedBy: d.requestedBy,
        reviewedBy: d.reviewedBy,
      })),
      ...clientOwnership.map((c) => ({
        id: c.id,
        type: 'CLIENT_OWNERSHIP' as const,
        status: c.status,
        reason: c.reason,
        amount: null,
        advisor: c.advisor,
        createdAt: c.createdAt,
        reviewedAt: c.reviewedAt,
        reviewNotes: c.reviewNotes,
        requestedBy: c.requestedBy,
        reviewedBy: c.reviewedBy,
      })),
      ...paymentEdits.map((p) => ({
        id: p.id,
        type: 'PAYMENT_EDIT' as const,
        status: p.status,
        reason: p.reason,
        amount: (p.newAmount ?? p.oldAmount).toString(),
        advisor: null,
        createdAt: p.createdAt,
        reviewedAt: p.reviewedAt,
        reviewNotes: p.reviewNotes,
        requestedBy: p.requestedBy,
        reviewedBy: p.reviewedBy,
      })),
      ...editRequests.map((e) => ({
        id: e.id,
        type: 'EDIT_REQUEST' as const,
        status: e.status,
        reason: e.observations,
        amount: null,
        advisor: null,
        createdAt: e.createdAt,
        reviewedAt: e.reviewedAt,
        reviewNotes: e.reviewNotes,
        requestedBy: e.requestedBy,
        reviewedBy: e.reviewedBy,
      })),
    ];

    // Orden cronológico descendente (más reciente primero)
    events.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    return events;
  }

  async removeDiscount(orderId: string, discountId: string) {
    const order = await this.findOne(orderId);
    this.assertNotAnulado(order, 'eliminar descuento');

    // Solo se pueden eliminar descuentos de órdenes CONFIRMED en adelante
    const allowedStatuses: OrderStatus[] = [
      OrderStatus.CONFIRMED,
      OrderStatus.IN_PRODUCTION,
      OrderStatus.READY,
      OrderStatus.DELIVERED,
      OrderStatus.DELIVERED_ON_CREDIT,
      OrderStatus.PAID,
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

  // ========== PROFITABILITY ==========

  private _calcProfitability(
    orderTotal: Prisma.Decimal,
    workOrders: { expenseOrders: { items: { total: Prisma.Decimal }[] }[] }[],
  ) {
    let totalExpensesDecimal = new Prisma.Decimal(0);
    for (const wo of workOrders) {
      for (const eg of wo.expenseOrders) {
        for (const item of eg.items) {
          totalExpensesDecimal = totalExpensesDecimal.add(item.total);
        }
      }
    }
    const orderTotalNum = Number(orderTotal.toString());
    const totalExpenses = Number(totalExpensesDecimal.toString());
    const utility = orderTotalNum - totalExpenses;
    const utilityPercentage = orderTotalNum > 0 ? (utility / orderTotalNum) * 100 : 0;
    return { totalExpenses, utility, utilityPercentage };
  }

  async getOrderProfitability(orderId: string): Promise<OrderProfitabilityDto> {
    const order = await this.ordersRepository.getOrderProfitabilityData(orderId);
    if (!order) {
      throw new NotFoundException(`Order with ID ${orderId} not found`);
    }

    const expenseOrders: ExpenseOrderSummaryDto[] = [];
    for (const wo of order.workOrders) {
      for (const eg of wo.expenseOrders) {
        const itemsTotal = eg.items.reduce(
          (sum, item) => sum + Number(item.total.toString()),
          0,
        );
        expenseOrders.push({
          id: eg.id,
          ogNumber: eg.ogNumber,
          status: eg.status,
          workOrderNumber: wo.workOrderNumber,
          itemsTotal,
        });
      }
    }

    const { totalExpenses, utility, utilityPercentage } = this._calcProfitability(
      order.total,
      order.workOrders,
    );

    return {
      orderId: order.id,
      orderNumber: order.orderNumber,
      orderTotal: Number(order.total.toString()),
      expenseOrders,
      totalExpenses,
      utility,
      utilityPercentage,
    };
  }

  async getProfitabilityList(filters: {
    search?: string;
    status?: string;
    orderDateFrom?: string;
    orderDateTo?: string;
    page?: number;
    limit?: number;
  }): Promise<PaginatedProfitabilityDto> {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;

    const { orders, total } = await this.ordersRepository.getProfitabilityList({
      search: filters.search,
      status: filters.status,
      orderDateFrom: startOfDay(filters.orderDateFrom),
      orderDateTo: endOfDay(filters.orderDateTo),
      page,
      limit,
    });

    const data: OrderProfitabilityListItemDto[] = orders.map((order) => {
      const { totalExpenses, utility, utilityPercentage } = this._calcProfitability(
        order.total,
        order.workOrders,
      );
      return {
        orderId: order.id,
        orderNumber: order.orderNumber,
        clientName: order.client.name,
        orderTotal: Number(order.total.toString()),
        totalExpenses,
        utility,
        utilityPercentage,
        status: order.status,
        orderDate: order.orderDate.toISOString(),
      };
    });

    return { data, total, page, limit };
  }

  private assertNotAnulado(order: { status: string }, operation: string): void {
    if (order.status === OrderStatus.ANULADO) {
      throw new ForbiddenException(
        `No se puede realizar "${operation}" porque la orden está ANULADA.`,
      );
    }
  }
}
