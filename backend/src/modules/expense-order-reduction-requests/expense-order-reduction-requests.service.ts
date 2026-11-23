import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { createOrReturnTwin } from '../../common/utils/unique-violation.util';
import { computeExpenseTotals } from '../../common/utils/expense-totals.util';
import { NotificationsService } from '../notifications/notifications.service';
import { WhatsappService } from '../whatsapp/whatsapp.service';
import { countWhatsappDeliveries } from '../whatsapp/whatsapp-notification.util';
import {
  ApprovalRequestHandler,
  ApprovalRequestInfo,
  ApprovalRequestRegistry,
} from '../whatsapp/approval-request-registry';
import { AccountsPayableService } from '../accounts-payable/accounts-payable.service';
import { ConsecutivesService } from '../consecutives/consecutives.service';
import {
  assertCashSessionNotCounting,
  findActiveCashSession,
} from '../cash-session/active-cash-session.util';
import {
  AccountPayableStatus,
  ApprovalRequestType,
  EditRequestStatus,
  ExpenseOrderReductionMoneyLocation,
  ExpenseOrderStatus,
  NotificationType,
  PaymentMethod,
  Prisma,
} from '../../generated/prisma';
import {
  crossesMonth,
  formatBusinessDateTime,
  formatCop,
  formatSignedCop,
  monthLabel,
} from '../cash-movement-transfer-requests/cash-movement-transfer.util';
import {
  computeClosingEffectOfVoid,
  movementApplyIssue,
  movementVoidBlocker,
} from '../expense-order-void-requests/expense-order-void.util';
import {
  MIN_REDUCTION_REASON_LENGTH,
  ReductionItemInput,
  allocateReduction,
  mergeReductionItems,
  toCents,
} from './expense-order-reduction.util';
import {
  CreateExpenseOrderReductionDto,
  PreviewExpenseOrderReductionDto,
  RegisterReductionRefundDto,
  ReviewExpenseOrderReductionDto,
} from './dto';

const PENDING_UNIQUE = 'expense_order_reduction_requests_pending_unique';

const USER_SELECT = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
} as const;

const REQUEST_INCLUDE = {
  requestedBy: { select: USER_SELECT },
  reviewedBy: { select: USER_SELECT },
  refundReceivedBy: { select: USER_SELECT },
  refundMovement: {
    select: {
      id: true,
      receiptNumber: true,
      paymentMethod: true,
      createdAt: true,
    },
  },
  expenseOrder: {
    select: { id: true, ogNumber: true, status: true, createdById: true },
  },
} satisfies Prisma.ExpenseOrderReductionRequestInclude;

type RequestWithRelations = Prisma.ExpenseOrderReductionRequestGetPayload<{
  include: typeof REQUEST_INCLUDE;
}>;

const SESSION_SELECT = {
  id: true,
  status: true,
  openedAt: true,
  closedAt: true,
  countStartedAt: true,
  closingAmount: true,
  systemBalance: true,
  discrepancy: true,
  notes: true,
  cashRegister: { select: { id: true, name: true } },
} satisfies Prisma.CashSessionSelect;

type Db = Prisma.TransactionClient | PrismaService;

export interface ReductionPlan {
  expenseOrder: { id: string; ogNumber: string; status: ExpenseOrderStatus };
  moneyLocation: ExpenseOrderReductionMoneyLocation;
  items: ReturnType<typeof mergeReductionItems>;
  previousSubtotal: string;
  newSubtotal: string;
  previousTotal: string;
  newTotal: string;
  /** Lo que se le ha pagado al proveedor (neto). */
  paid: string;
  /** Lo que tiene que volver a la empresa. */
  difference: string;
  /** NEVER_LEFT: cuánto baja cada egreso. */
  adjustments: Array<{
    movementId: string;
    receiptNumber: string;
    paymentMethod: string;
    amountBefore: string;
    amountAfter: string;
    session: {
      id: string;
      status: string;
      cashRegisterName: string;
      closedAt: Date | null;
    };
    blocker: string | null;
    applyIssue: string | null;
  }>;
  closings: Array<{
    sessionId: string;
    cashRegisterName: string;
    closedAt: Date;
    receipts: string[];
    systemBalanceBefore: string;
    systemBalanceAfter: string;
    discrepancyBefore: string;
    discrepancyAfter: string;
    worsens: boolean;
    crossesMonth: boolean;
    monthLabel: string;
  }>;
  openSessionsCashChange: string;
  accountPayable: { id: string; apNumber: string } | null;
  ineligibleReason: string | null;
  applyIssue: string | null;
  pendingRequestId: string | null;
}

/**
 * Bajar el valor de una OG pagada, con aprobación de un admin distinto de quien
 * lo pide. Complementa la edición de OG pagada (que solo deja subir el total) y
 * la anulación (`expense-order-void-requests`).
 */
@Injectable()
export class ExpenseOrderReductionRequestsService implements OnModuleInit, ApprovalRequestHandler {
  private readonly logger = new Logger(ExpenseOrderReductionRequestsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
    private readonly whatsappService: WhatsappService,
    private readonly approvalRegistry: ApprovalRequestRegistry,
    private readonly accountsPayableService: AccountsPayableService,
    private readonly consecutivesService: ConsecutivesService,
  ) {}

  onModuleInit() {
    this.approvalRegistry.register(ApprovalRequestType.EXPENSE_ORDER_REDUCTION, this);
  }

  // ─── Plan ───

  async preview(
    expenseOrderId: string,
    dto: PreviewExpenseOrderReductionDto,
  ): Promise<ReductionPlan> {
    return this.buildPlan(this.prisma, expenseOrderId, dto.items, dto.moneyLocation, new Date());
  }

  private async buildPlan(
    db: Db,
    expenseOrderId: string,
    incoming: ReductionItemInput[],
    moneyLocation: ExpenseOrderReductionMoneyLocation,
    requestedAt: Date,
    /** Al aplicar, la propia solicitud ya está APPROVED: no cuenta como reintegro pendiente. */
    selfRequestId?: string,
  ): Promise<ReductionPlan> {
    const og = await db.expenseOrder.findUnique({
      where: { id: expenseOrderId },
      select: {
        id: true,
        ogNumber: true,
        status: true,
        applyIva: true,
        ivaRate: true,
        retefuenteRate: true,
        reteICARate: true,
        reteIVARate: true,
        items: {
          select: {
            id: true,
            name: true,
            quantity: true,
            unitPrice: true,
            total: true,
          },
          orderBy: { sortOrder: 'asc' },
        },
        accountPayable: {
          select: {
            id: true,
            apNumber: true,
            status: true,
            payments: {
              where: { isReversed: false },
              select: { amount: true, cashMovementId: true },
            },
          },
        },
      },
    });
    if (!og) throw new NotFoundException(`OG con id ${expenseOrderId} no encontrada`);

    let items: ReturnType<typeof mergeReductionItems>;
    try {
      items = mergeReductionItems(og.items, incoming);
    } catch (error) {
      throw new BadRequestException((error as Error).message);
    }

    const rates = {
      applyIva: og.applyIva,
      ivaRate: og.ivaRate as unknown as number,
      retefuenteRate: og.retefuenteRate as unknown as number,
      reteICARate: og.reteICARate as unknown as number,
      reteIVARate: og.reteIVARate as unknown as number,
    };
    const previousSubtotal = og.items.reduce((sum, i) => sum.add(i.total), new Prisma.Decimal(0));
    const newSubtotal = items.reduce((sum, i) => sum.add(i.total), new Prisma.Decimal(0));
    const previousTotal = toCents(computeExpenseTotals(previousSubtotal.toNumber(), rates).total);
    const newTotal = toCents(computeExpenseTotals(newSubtotal.toNumber(), rates).total);

    // Lo pagado: abonos vivos de la CP más egresos de la OG que la CP no refleja.
    const ap = og.accountPayable;
    const paidByAp = (ap?.payments ?? []).reduce(
      (sum, p) => sum.add(p.amount),
      new Prisma.Decimal(0),
    );
    const linkedMovementIds = new Set(
      (ap?.payments ?? []).map((p) => p.cashMovementId).filter(Boolean),
    );
    const ogMovements = await db.cashMovement.findMany({
      where: {
        OR: [
          {
            referenceType: 'EXPENSE_ORDER',
            referenceId: og.id,
            movementType: 'EXPENSE',
          },
          { id: { in: [...linkedMovementIds] as string[] } },
        ],
        isVoided: false,
        originalMovement: null,
      },
      select: {
        id: true,
        receiptNumber: true,
        movementType: true,
        paymentMethod: true,
        amount: true,
        createdAt: true,
        expenseOrderItemPayment: { select: { id: true } },
        cashSession: { select: SESSION_SELECT },
      },
      orderBy: { createdAt: 'desc' },
    });
    const unreflected = ogMovements
      .filter((m) => m.movementType === 'EXPENSE' && !linkedMovementIds.has(m.id))
      .reduce((sum, m) => sum.add(m.amount), new Prisma.Decimal(0));
    const paid = toCents(paidByAp.add(unreflected));
    const difference = toCents(paid.sub(newTotal));

    // Egresos que bajan (solo si el dinero nunca salió).
    const adjustments: ReductionPlan['adjustments'] = [];
    const closings: ReductionPlan['closings'] = [];
    let openSessionsCashChange = new Prisma.Decimal(0);
    let shortfall = new Prisma.Decimal(0);
    if (
      moneyLocation === ExpenseOrderReductionMoneyLocation.NEVER_LEFT &&
      difference.greaterThan(0)
    ) {
      const expenses = ogMovements.filter((m) => m.movementType === 'EXPENSE');
      const allocated = allocateReduction(expenses, difference);
      shortfall = allocated.shortfall;
      const bySession = new Map<string, typeof allocated.allocations>();
      for (const a of allocated.allocations) {
        const m = a.movement;
        adjustments.push({
          movementId: m.id,
          receiptNumber: m.receiptNumber,
          paymentMethod: m.paymentMethod,
          amountBefore: new Prisma.Decimal(m.amount).toString(),
          amountAfter: a.amountAfter.toString(),
          session: {
            id: m.cashSession.id,
            status: m.cashSession.status,
            cashRegisterName: m.cashSession.cashRegister.name,
            closedAt: m.cashSession.closedAt,
          },
          blocker: m.expenseOrderItemPayment
            ? `${m.receiptNumber} es parte de un pago mixto: esa línea no se corrige desde aquí. Anula la OG y créala de nuevo.`
            : movementVoidBlocker(m, m.cashSession, requestedAt),
          applyIssue: movementApplyIssue(m, m.cashSession),
        });
        bySession.set(m.cashSession.id, [...(bySession.get(m.cashSession.id) ?? []), a]);
      }
      for (const group of bySession.values()) {
        const session = group[0].movement.cashSession;
        const cash = group.filter((a) => a.movement.paymentMethod === PaymentMethod.CASH);
        if (cash.length === 0) continue;
        // Bajar un egreso en `delta` mueve lo esperado igual que anular un egreso de `delta`.
        const effect = computeClosingEffectOfVoid(
          session,
          cash.map((a) => ({
            movementType: 'EXPENSE' as const,
            paymentMethod: PaymentMethod.CASH,
            amount: a.delta,
          })),
        );
        if (session.status === 'OPEN') {
          openSessionsCashChange = openSessionsCashChange.add(
            effect.systemBalanceAfter.sub(effect.systemBalanceBefore),
          );
          continue;
        }
        if (!session.closedAt) continue;
        closings.push({
          sessionId: session.id,
          cashRegisterName: session.cashRegister.name,
          closedAt: session.closedAt,
          receipts: cash.map((a) => a.movement.receiptNumber),
          systemBalanceBefore: effect.systemBalanceBefore.toString(),
          systemBalanceAfter: effect.systemBalanceAfter.toString(),
          discrepancyBefore: effect.discrepancyBefore.toString(),
          discrepancyAfter: effect.discrepancyAfter.toString(),
          worsens: effect.worsens,
          crossesMonth: crossesMonth(session.closedAt, requestedAt),
          monthLabel: monthLabel(session.closedAt),
        });
      }
    }

    const [pending, refundPending, voidPending] = await Promise.all([
      db.expenseOrderReductionRequest.findFirst({
        where: { expenseOrderId: og.id, status: EditRequestStatus.PENDING },
        select: { id: true },
      }),
      db.expenseOrderReductionRequest.count({
        where: {
          expenseOrderId: og.id,
          status: EditRequestStatus.APPROVED,
          moneyLocation: ExpenseOrderReductionMoneyLocation.SUPPLIER_RETURNS,
          refundReceivedAt: null,
          ...(selfRequestId && { id: { not: selfRequestId } }),
        },
      }),
      db.expenseOrderVoidRequest.count({
        where: { expenseOrderId: og.id, status: EditRequestStatus.PENDING },
      }),
    ]);

    let ineligibleReason: string | null = null;
    if (og.status !== ExpenseOrderStatus.PAID) {
      ineligibleReason =
        'Solo se puede bajar el valor de una OG pagada. Si no está pagada, edítala.';
    } else if (!ap || ap.status === AccountPayableStatus.CANCELLED) {
      ineligibleReason =
        'La OG no tiene una cuenta por pagar vigente: no se puede bajar su valor desde aquí.';
    } else if (refundPending > 0) {
      ineligibleReason =
        'La OG tiene un reintegro pendiente: Caja debe registrarlo antes de otro cambio.';
    } else if (voidPending > 0) {
      ineligibleReason = 'La OG tiene una solicitud de anulación pendiente.';
    } else if (difference.lessThanOrEqualTo(0)) {
      ineligibleReason = `El valor nuevo (${formatCop(newTotal)}) no baja de lo pagado (${formatCop(paid)}): no hay nada que devolver. Si hay que cambiar algo, usa «Editar».`;
    } else if (shortfall.greaterThan(0)) {
      ineligibleReason = 'Los egresos de la OG no alcanzan para la diferencia.';
    } else {
      ineligibleReason = adjustments.find((a) => a.blocker)?.blocker ?? null;
    }

    return {
      expenseOrder: { id: og.id, ogNumber: og.ogNumber, status: og.status },
      moneyLocation,
      items,
      previousSubtotal: toCents(previousSubtotal).toString(),
      newSubtotal: toCents(newSubtotal).toString(),
      previousTotal: previousTotal.toString(),
      newTotal: newTotal.toString(),
      paid: paid.toString(),
      difference: difference.toString(),
      adjustments,
      closings,
      openSessionsCashChange: openSessionsCashChange.toString(),
      accountPayable: ap ? { id: ap.id, apNumber: ap.apNumber } : null,
      ineligibleReason,
      applyIssue: adjustments.find((a) => a.applyIssue)?.applyIssue ?? null,
      pendingRequestId: pending?.id ?? null,
    };
  }

  private itemsOf(request: { newItems: Prisma.JsonValue }): ReductionItemInput[] {
    return request.newItems as unknown as ReductionItemInput[];
  }

  // ─── Lectura ───

  async findByExpenseOrder(expenseOrderId: string) {
    return this.prisma.expenseOrderReductionRequest.findMany({
      where: { expenseOrderId },
      include: REQUEST_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findAllPending(userId: string) {
    await this.assertAdmin(userId);
    const requests = await this.prisma.expenseOrderReductionRequest.findMany({
      where: { status: EditRequestStatus.PENDING },
      include: REQUEST_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
    return Promise.all(
      requests.map(async (r) => ({
        ...r,
        plan: await this.buildPlan(
          this.prisma,
          r.expenseOrderId,
          this.itemsOf(r),
          r.moneyLocation,
          r.createdAt,
        ).catch(() => null),
      })),
    );
  }

  async findAll(userId: string) {
    await this.assertAdmin(userId);
    return this.prisma.expenseOrderReductionRequest.findMany({
      include: REQUEST_INCLUDE,
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  }

  /** Reintegros que Caja todavía no ha recibido. */
  async findPendingRefunds() {
    return this.prisma.expenseOrderReductionRequest.findMany({
      where: {
        status: EditRequestStatus.APPROVED,
        moneyLocation: ExpenseOrderReductionMoneyLocation.SUPPLIER_RETURNS,
        refundReceivedAt: null,
      },
      include: REQUEST_INCLUDE,
      orderBy: { reviewedAt: 'asc' },
    });
  }

  // ─── Crear ───

  async create(expenseOrderId: string, userId: string, dto: CreateExpenseOrderReductionDto) {
    const reason = dto.reason.trim();
    if (reason.length < MIN_REDUCTION_REASON_LENGTH) {
      throw new BadRequestException(
        `El motivo debe tener al menos ${MIN_REDUCTION_REASON_LENGTH} caracteres`,
      );
    }
    const plan = await this.preview(expenseOrderId, dto);
    if (plan.ineligibleReason) throw new BadRequestException(plan.ineligibleReason);
    if (plan.pendingRequestId) {
      throw new BadRequestException(
        'Ya hay una solicitud pendiente para bajar el valor de esta OG',
      );
    }

    const { request, wasDuplicate } = await createOrReturnTwin({
      constraint: PENDING_UNIQUE,
      create: () =>
        this.prisma.expenseOrderReductionRequest.create({
          data: {
            expenseOrderId,
            requestedById: userId,
            reason,
            newItems: dto.items.map((i) => ({
              itemId: i.itemId,
              quantity: i.quantity,
              unitPrice: i.unitPrice,
            })) as unknown as Prisma.InputJsonValue,
            previousTotal: new Prisma.Decimal(plan.previousTotal),
            newTotal: new Prisma.Decimal(plan.newTotal),
            difference: new Prisma.Decimal(plan.difference),
            moneyLocation: dto.moneyLocation,
            status: EditRequestStatus.PENDING,
          },
          include: REQUEST_INCLUDE,
        }),
      findTwin: () =>
        this.prisma.expenseOrderReductionRequest.findFirst({
          where: { expenseOrderId, status: EditRequestStatus.PENDING },
          include: REQUEST_INCLUDE,
        }),
    });
    if (wasDuplicate) return request;

    const label = this.describe(request);
    await this.notificationsService.notifyAllAdmins({
      type: NotificationType.EXPENSE_ORDER_REDUCTION_PENDING,
      title: 'Bajar el valor de una OG pagada',
      message: `${this.userName(request.requestedBy)} solicita ${label}`,
      relatedId: request.id,
      relatedType: 'ExpenseOrderReductionRequest',
    });
    void this.notifyAdminsByWhatsApp(request, label);
    return request;
  }

  // ─── Revisar ───

  async approve(requestId: string, reviewerId: string, dto: ReviewExpenseOrderReductionDto) {
    await this.assertReviewer(requestId, reviewerId);

    // Que todo egreso de la OG tenga su abono en la CP antes de tocarla (CP
    // históricas sin conciliar): así lo pagado sale solo de los abonos.
    const pre = await this.prisma.expenseOrderReductionRequest.findUniqueOrThrow({
      where: { id: requestId },
      select: { expenseOrderId: true },
    });
    await this.accountsPayableService.settleFromExpenseOrderMovements(
      pre.expenseOrderId,
      reviewerId,
    );

    const applied = await this.applyReduction(requestId, reviewerId, dto.reviewNotes);
    await this.notifyApproved(applied);
    return applied;
  }

  async reject(requestId: string, reviewerId: string, dto: ReviewExpenseOrderReductionDto) {
    await this.assertReviewer(requestId, reviewerId);
    const notes = dto.reviewNotes?.trim();
    if (!notes) throw new BadRequestException('Escribe el motivo del rechazo');

    const claimed = await this.prisma.expenseOrderReductionRequest.updateMany({
      where: { id: requestId, status: EditRequestStatus.PENDING },
      data: {
        status: EditRequestStatus.REJECTED,
        reviewedById: reviewerId,
        reviewedAt: new Date(),
        reviewNotes: notes,
      },
    });
    if (claimed.count === 0)
      throw new ConflictException('La solicitud ya fue procesada por otra persona');

    const rejected = await this.prisma.expenseOrderReductionRequest.findUniqueOrThrow({
      where: { id: requestId },
      include: REQUEST_INCLUDE,
    });
    await this.notificationsService.create({
      userId: rejected.requestedById,
      type: NotificationType.EXPENSE_ORDER_REDUCTION_REJECTED,
      title: 'Se rechazó bajar el valor de la OG',
      message: `${rejected.expenseOrder.ogNumber}: ${notes}`,
      relatedId: rejected.id,
      relatedType: 'ExpenseOrderReductionRequest',
    });
    return rejected;
  }

  private async assertAdmin(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: { select: { name: true } } },
    });
    if (user?.role?.name !== 'admin') {
      throw new ForbiddenException('Solo los administradores pueden revisar estas solicitudes');
    }
  }

  /** Un admin, y nunca quien la pidió, aunque sea admin (decisión del cliente, 2026-11-20). */
  private async assertReviewer(requestId: string, reviewerId: string) {
    const request = await this.prisma.expenseOrderReductionRequest.findUnique({
      where: { id: requestId },
      select: { requestedById: true, status: true },
    });
    if (!request || request.status !== EditRequestStatus.PENDING) {
      throw new NotFoundException('Solicitud no encontrada o ya fue procesada');
    }
    await this.assertAdmin(reviewerId);
    if (request.requestedById === reviewerId) {
      throw new ForbiddenException(
        'No puedes aprobar ni rechazar una solicitud que tú mismo pediste: debe revisarla otro administrador.',
      );
    }
  }

  private async applyReduction(requestId: string, reviewerId: string, reviewNotes?: string) {
    return this.prisma.$transaction(
      async (tx) => {
        const now = new Date();
        const claimed = await tx.expenseOrderReductionRequest.updateMany({
          where: { id: requestId, status: EditRequestStatus.PENDING },
          data: {
            status: EditRequestStatus.APPROVED,
            reviewedById: reviewerId,
            reviewedAt: now,
            reviewNotes: reviewNotes?.trim() || null,
          },
        });
        if (claimed.count === 0)
          throw new ConflictException('La solicitud ya fue procesada por otra persona');

        const request = await tx.expenseOrderReductionRequest.findUniqueOrThrow({
          where: { id: requestId },
        });
        await tx.$queryRaw`SELECT id FROM expense_orders WHERE id = ${request.expenseOrderId} FOR UPDATE`;

        const plan = await this.buildPlan(
          tx,
          request.expenseOrderId,
          this.itemsOf(request),
          request.moneyLocation,
          request.createdAt,
          request.id,
        );
        if (plan.ineligibleReason) throw new BadRequestException(plan.ineligibleReason);
        if (plan.applyIssue) throw new BadRequestException(plan.applyIssue);
        if (!new Prisma.Decimal(plan.difference).equals(request.difference)) {
          throw new ConflictException(
            `La OG cambió desde que se pidió (la diferencia ahora es ${formatCop(plan.difference)}). Rechaza esta solicitud y que la pidan de nuevo.`,
          );
        }
        for (const id of [...new Set(plan.adjustments.map((a) => a.session.id))].sort()) {
          await tx.$queryRaw`SELECT id FROM cash_sessions WHERE id = ${id} FOR UPDATE`;
        }

        const og = plan.expenseOrder;
        const fecha = formatBusinessDateTime(now);
        const audits: Prisma.AuditLogCreateManyInput[] = [];
        const meta = {
          expenseOrderReductionRequestId: request.id,
          reason: request.reason,
        };

        // 1. Ítems con su valor nuevo.
        for (const item of plan.items) {
          await tx.expenseOrderItem.update({
            where: { id: item.id },
            data: {
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              total: new Prisma.Decimal(item.total),
            },
            select: { id: true },
          });
        }
        audits.push({
          userId: reviewerId,
          recordId: og.id,
          action: 'UPDATE',
          model: 'ExpenseOrder',
          oldData: {
            total: plan.previousTotal,
            items: plan.items.map((i) => ({
              id: i.id,
              quantity: i.previousQuantity,
              unitPrice: i.previousUnitPrice,
              total: i.previousTotal,
            })),
          },
          newData: {
            total: plan.newTotal,
            items: plan.items.map((i) => ({
              id: i.id,
              quantity: i.quantity,
              unitPrice: i.unitPrice,
              total: i.total,
            })),
          },
          changedFields: ['items'],
          metadata: {
            ...meta,
            moneyLocation: request.moneyLocation,
            difference: plan.difference,
          },
        });

        // 2. Egresos que bajan (el dinero nunca salió).
        for (const a of plan.adjustments) {
          const movement = await tx.cashMovement.findUniqueOrThrow({
            where: { id: a.movementId },
            select: { description: true, amount: true, isVoided: true },
          });
          if (movement.isVoided || !movement.amount.equals(a.amountBefore)) {
            throw new ConflictException(`${a.receiptNumber} cambió mientras se aplicaba`);
          }
          const description =
            `${movement.description} [El ${fecha} bajó de ${formatCop(a.amountBefore)} a ${formatCop(a.amountAfter)}: ` +
            `el valor real de la ${og.ogNumber} era menor y la diferencia nunca salió de caja]`;
          await tx.cashMovement.update({
            where: { id: a.movementId },
            data: { amount: new Prisma.Decimal(a.amountAfter), description },
            select: { id: true },
          });
          await tx.accountPayablePayment.updateMany({
            where: { cashMovementId: a.movementId, isReversed: false },
            data: { amount: new Prisma.Decimal(a.amountAfter) },
          });
          audits.push({
            userId: reviewerId,
            recordId: a.movementId,
            action: 'UPDATE',
            model: 'CashMovement',
            oldData: {
              amount: a.amountBefore,
              description: movement.description,
            },
            newData: { amount: a.amountAfter, description },
            changedFields: ['amount', 'description'],
            metadata: meta,
          });
        }

        // 3. Cierres ya firmados que cambian.
        for (const c of plan.closings) {
          const session = await tx.cashSession.findUniqueOrThrow({
            where: { id: c.sessionId },
            select: { notes: true },
          });
          const note =
            `[Valor de OG bajado ${fecha}] ${c.receipts.join(', ')} de la ${og.ogNumber}: ${request.reason}. ` +
            `Esperado ${formatCop(c.systemBalanceBefore)} → ${formatCop(c.systemBalanceAfter)}; ` +
            `diferencia ${formatSignedCop(c.discrepancyBefore)} → ${formatSignedCop(c.discrepancyAfter)}.`;
          const notes = session.notes ? `${session.notes}\n${note}` : note;
          await tx.cashSession.update({
            where: { id: c.sessionId },
            data: {
              systemBalance: new Prisma.Decimal(c.systemBalanceAfter),
              discrepancy: new Prisma.Decimal(c.discrepancyAfter),
              notes,
            },
            select: { id: true },
          });
          audits.push({
            userId: reviewerId,
            recordId: c.sessionId,
            action: 'UPDATE',
            model: 'CashSession',
            oldData: {
              systemBalance: c.systemBalanceBefore,
              discrepancy: c.discrepancyBefore,
              notes: session.notes,
            },
            newData: {
              systemBalance: c.systemBalanceAfter,
              discrepancy: c.discrepancyAfter,
              notes,
            },
            changedFields: ['systemBalance', 'discrepancy', 'notes'],
            metadata: { ...meta, editedAfterSessionClose: true },
          });
        }

        // 4. La CP con el total nuevo. Si el proveedor devuelve, queda debiendo
        // la diferencia (saldo negativo) hasta que Caja registre el reintegro.
        await tx.accountPayable.update({
          where: { id: plan.accountPayable!.id },
          data: {
            totalAmount: new Prisma.Decimal(plan.newTotal),
            subtotalAmount: new Prisma.Decimal(plan.newSubtotal),
          },
          select: { id: true },
        });
        await this.refreshAccountPayable(tx, plan.accountPayable!.id);

        await tx.expenseOrderReductionRequest.update({
          where: { id: request.id },
          data: {
            appliedAt: now,
            appliedEffect: {
              previousTotal: plan.previousTotal,
              newTotal: plan.newTotal,
              difference: plan.difference,
              adjustments: plan.adjustments,
              closings: plan.closings,
              openSessionsCashChange: plan.openSessionsCashChange,
            } as unknown as Prisma.InputJsonValue,
          },
          select: { id: true },
        });
        await tx.auditLog.createMany({ data: audits });

        return tx.expenseOrderReductionRequest.findUniqueOrThrow({
          where: { id: request.id },
          include: REQUEST_INCLUDE,
        });
      },
      { timeout: 30_000, maxWait: 10_000 },
    );
  }

  /** Mismo cálculo que `AccountsPayableService.refreshFromLivePayments`, dentro de la transacción. */
  private async refreshAccountPayable(tx: Prisma.TransactionClient, apId: string) {
    const ap = await tx.accountPayable.findUniqueOrThrow({
      where: { id: apId },
      select: { totalAmount: true },
    });
    const vivos = await tx.accountPayablePayment.findMany({
      where: { accountPayableId: apId, isReversed: false },
      select: { amount: true },
    });
    const paidAmount = vivos.reduce((sum, p) => sum.add(p.amount), new Prisma.Decimal(0));
    const balance = new Prisma.Decimal(ap.totalAmount).sub(paidAmount);
    await tx.accountPayable.update({
      where: { id: apId },
      data: {
        paidAmount,
        balance,
        status: balance.lessThanOrEqualTo(0)
          ? AccountPayableStatus.PAID
          : paidAmount.greaterThan(0)
            ? AccountPayableStatus.PARTIAL
            : AccountPayableStatus.PENDING,
      },
      select: { id: true },
    });
  }

  // ─── Reintegro (Caja) ───

  /**
   * Caja recibe del proveedor la diferencia: entra como ingreso a la caja
   * abierta y los abonos de la CP bajan en lo mismo, del más reciente al más
   * antiguo, para que lo pagado quede en el valor nuevo. Los abonos no se
   * revierten: sus egresos siguen vivos (ver invariante
   * `cp_pagos_revertidos_con_caja_viva`).
   */
  async registerRefund(requestId: string, userId: string, dto: RegisterReductionRefundDto) {
    const request = await this.prisma.expenseOrderReductionRequest.findUnique({
      where: { id: requestId },
      include: REQUEST_INCLUDE,
    });
    if (
      !request ||
      request.status !== EditRequestStatus.APPROVED ||
      request.moneyLocation !== ExpenseOrderReductionMoneyLocation.SUPPLIER_RETURNS
    ) {
      throw new NotFoundException('No hay un reintegro por registrar en esta solicitud');
    }
    if (request.refundReceivedAt) throw new BadRequestException('El reintegro ya se registró');
    if (dto.paymentMethod === PaymentMethod.CREDIT) {
      throw new BadRequestException('Un reintegro es dinero que entra: no puede ser a crédito');
    }

    const session = await findActiveCashSession(this.prisma);
    if (!session)
      throw new BadRequestException('No hay una caja abierta para recibir el reintegro');
    assertCashSessionNotCounting(session, dto.paymentMethod);

    const receiptNumber = await this.consecutivesService.generateNumber('CASH_RECEIPT');
    const amount = new Prisma.Decimal(request.difference);
    const og = request.expenseOrder;

    await this.prisma.$transaction(async (tx) => {
      const now = new Date();
      const claimed = await tx.expenseOrderReductionRequest.updateMany({
        where: { id: requestId, refundReceivedAt: null },
        data: { refundReceivedAt: now, refundReceivedById: userId },
      });
      if (claimed.count === 0) throw new ConflictException('El reintegro ya se registró');

      const open = await tx.cashSession.findUnique({
        where: { id: session.id },
        select: { status: true, countStartedAt: true },
      });
      if (open?.status !== 'OPEN')
        throw new ConflictException('La caja se cerró mientras se registraba el reintegro');
      assertCashSessionNotCounting(open, dto.paymentMethod);

      const movement = await tx.cashMovement.create({
        data: {
          cashSessionId: session.id,
          receiptNumber,
          movementType: 'INCOME',
          paymentMethod: dto.paymentMethod,
          amount,
          description:
            `Reintegro de la ${og.ogNumber}: el proveedor devolvió la diferencia ` +
            `(el valor bajó de ${formatCop(request.previousTotal)} a ${formatCop(request.newTotal)})` +
            (dto.notes?.trim() ? `. ${dto.notes.trim()}` : ''),
          referenceType: 'EXPENSE_ORDER',
          referenceId: og.id,
          performedById: userId,
        },
        select: { id: true },
      });
      await tx.expenseOrderReductionRequest.update({
        where: { id: requestId },
        data: { refundMovementId: movement.id },
        select: { id: true },
      });

      const ap = await tx.accountPayable.findUnique({
        where: { expenseOrderId: og.id },
        select: { id: true },
      });
      if (ap) {
        const payments = await tx.accountPayablePayment.findMany({
          where: { accountPayableId: ap.id, isReversed: false },
          select: { id: true, amount: true },
          orderBy: { paymentDate: 'desc' },
        });
        const { allocations } = allocateReduction(payments, amount);
        for (const a of allocations) {
          await tx.accountPayablePayment.update({
            where: { id: a.movement.id },
            data: {
              amount: a.amountAfter,
              notes: `Bajó ${formatCop(a.delta)} por el reintegro ${receiptNumber} de la ${og.ogNumber}`,
            },
            select: { id: true },
          });
        }
        await this.refreshAccountPayable(tx, ap.id);
      }

      await tx.auditLog.create({
        data: {
          userId,
          recordId: movement.id,
          action: 'CREATE',
          model: 'CashMovement',
          newData: {
            receiptNumber,
            movementType: 'INCOME',
            amount: amount.toString(),
            paymentMethod: dto.paymentMethod,
          },
          metadata: {
            expenseOrderReductionRequestId: requestId,
            expenseOrderId: og.id,
          },
        },
        select: { id: true },
      });
    });

    return this.prisma.expenseOrderReductionRequest.findUniqueOrThrow({
      where: { id: requestId },
      include: REQUEST_INCLUDE,
    });
  }

  // ─── Mensajes ───

  private userName(user: {
    firstName: string | null;
    lastName: string | null;
    email: string | null;
  }) {
    return [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email || 'Un usuario';
  }

  /** «bajar la OG-2026-1224 de $109.585 a $80.000 (el proveedor devuelve $29.585)» */
  private describe(
    request: Pick<
      RequestWithRelations,
      'expenseOrder' | 'previousTotal' | 'newTotal' | 'difference' | 'moneyLocation'
    >,
  ) {
    const where =
      request.moneyLocation === ExpenseOrderReductionMoneyLocation.SUPPLIER_RETURNS
        ? `el proveedor devuelve ${formatCop(request.difference)}`
        : `${formatCop(request.difference)} que nunca salieron de caja`;
    return `bajar la ${request.expenseOrder.ogNumber} de ${formatCop(request.previousTotal)} a ${formatCop(request.newTotal)} (${where})`;
  }

  private async notifyAdminsByWhatsApp(request: RequestWithRelations, label: string) {
    try {
      const phones = await this.whatsappService.getAdminPhones();
      if (phones.length === 0) return;
      const requester = await this.prisma.user.findUnique({
        where: { id: request.requestedById },
        select: {
          firstName: true,
          lastName: true,
          email: true,
          role: { select: { name: true } },
        },
      });
      const results = await Promise.allSettled(
        phones.map((telefono) =>
          this.whatsappService.sendApprovalNotification({
            telefono,
            requesterName: requester ? this.userName(requester) : 'Usuario',
            requesterRole: requester?.role?.name || 'usuario',
            actionDescription: `${label.charAt(0).toUpperCase()}${label.slice(1)}.`,
            reason: request.reason,
            requestId: request.id,
            requestType: ApprovalRequestType.EXPENSE_ORDER_REDUCTION,
          }),
        ),
      );
      const { sent, failed } = countWhatsappDeliveries(results);
      this.logger.log(
        `WhatsApp de bajar valor ${request.id}: ${sent} enviados, ${failed} fallidos`,
      );
    } catch (error) {
      this.logger.error(
        `Error enviando WhatsApp de bajar valor ${request.id}: ${(error as Error).message}`,
      );
    }
  }

  private async notifyApproved(request: RequestWithRelations) {
    const pendingRefund =
      request.moneyLocation === ExpenseOrderReductionMoneyLocation.SUPPLIER_RETURNS;
    const message = pendingRefund
      ? `La ${request.expenseOrder.ogNumber} quedó en ${formatCop(request.newTotal)}. Cuando el proveedor devuelva ${formatCop(request.difference)}, Caja debe registrar el reintegro en la OG.`
      : `La ${request.expenseOrder.ogNumber} quedó en ${formatCop(request.newTotal)} y su egreso de caja se corrigió.`;
    const recipients = new Set([request.requestedById, request.expenseOrder.createdById]);
    await Promise.all(
      [...recipients].map((userId) =>
        this.notificationsService.create({
          userId,
          type: NotificationType.EXPENSE_ORDER_REDUCTION_APPROVED,
          title: 'Valor de la OG bajado',
          message,
          relatedId: request.id,
          relatedType: 'ExpenseOrderReductionRequest',
        }),
      ),
    );
  }

  // ─── ApprovalRequestHandler (WhatsApp) ───

  async findPendingRequest(requestId: string): Promise<ApprovalRequestInfo | null> {
    const request = await this.prisma.expenseOrderReductionRequest.findUnique({
      where: { id: requestId },
      include: REQUEST_INCLUDE,
    });
    if (!request) return null;
    return {
      id: request.id,
      status: request.status,
      requestedById: request.requestedById,
      displayLabel: `bajar el valor de la ${request.expenseOrder.ogNumber}`,
    };
  }

  async approveViaWhatsApp(requestId: string, reviewerId: string): Promise<void> {
    await this.approve(requestId, reviewerId, {
      reviewNotes: 'Aprobado vía WhatsApp',
    });
  }

  async rejectViaWhatsApp(requestId: string, reviewerId: string): Promise<void> {
    await this.reject(requestId, reviewerId, {
      reviewNotes: 'Rechazado vía WhatsApp',
    });
  }

  async getEntityId(requestId: string): Promise<string | null> {
    const request = await this.prisma.expenseOrderReductionRequest.findUnique({
      where: { id: requestId },
      select: { expenseOrderId: true },
    });
    return request?.expenseOrderId ?? null;
  }
}
