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
import { ACTIVE_LOT_STATUSES } from '../../common/utils/supply-lot-stock.util';
import { NotificationsService } from '../notifications/notifications.service';
import { WhatsappService } from '../whatsapp/whatsapp.service';
import { countWhatsappDeliveries } from '../whatsapp/whatsapp-notification.util';
import {
  ApprovalRequestHandler,
  ApprovalRequestInfo,
  ApprovalRequestRegistry,
} from '../whatsapp/approval-request-registry';
import { SupplyLotsService } from '../supply-lots/supply-lots.service';
import {
  AccountPayableStatus,
  ApprovalRequestType,
  EditRequestStatus,
  ExpenseOrderStatus,
  NotificationType,
  Prisma,
  SupplyLotStatus,
} from '../../generated/prisma';
import {
  crossesMonth,
  formatBusinessDateTime,
  formatCop,
  formatSignedCop,
  monthLabel,
} from '../cash-movement-transfer-requests/cash-movement-transfer.util';
import {
  MIN_VOID_REASON_LENGTH,
  computeClosingEffectOfVoid,
  movementApplyIssue,
  movementVoidBlocker,
} from './expense-order-void.util';
import { CreateExpenseOrderVoidRequestDto, ReviewExpenseOrderVoidRequestDto } from './dto';

const PENDING_UNIQUE = 'expense_order_void_requests_pending_unique';

const USER_SELECT = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
} as const;

const REQUEST_INCLUDE = {
  requestedBy: { select: USER_SELECT },
  reviewedBy: { select: USER_SELECT },
  expenseOrder: {
    select: { id: true, ogNumber: true, status: true, createdById: true },
  },
} satisfies Prisma.ExpenseOrderVoidRequestInclude;

type RequestWithRelations = Prisma.ExpenseOrderVoidRequestGetPayload<{
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

const MOVEMENT_SELECT = {
  id: true,
  receiptNumber: true,
  movementType: true,
  paymentMethod: true,
  amount: true,
  description: true,
  createdAt: true,
  cashSession: { select: SESSION_SELECT },
} satisfies Prisma.CashMovementSelect;

type Db = Prisma.TransactionClient | PrismaService;

/** Todo lo que la anulación va a tocar, calculado hoy. */
export interface VoidPlan {
  expenseOrder: {
    id: string;
    ogNumber: string;
    status: ExpenseOrderStatus;
    createdById: string;
  };
  movements: Array<{
    id: string;
    receiptNumber: string;
    movementType: string;
    paymentMethod: string;
    amount: string;
    createdAt: Date;
    session: {
      id: string;
      status: string;
      cashRegisterName: string;
      openedAt: Date;
      closedAt: Date | null;
    };
    blocker: string | null;
    applyIssue: string | null;
  }>;
  /** Un cierre por sesión cerrada con egresos en efectivo de la OG. */
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
  /** Cuánto sube lo esperado en cajas abiertas (efectivo que vuelve a contarse). */
  openSessionsCashChange: string;
  accountPayable: {
    id: string;
    apNumber: string;
    status: AccountPayableStatus;
    paidAmount: string;
    paymentsToReverse: number;
  } | null;
  lots: Array<{
    id: string;
    code: string;
    status: SupplyLotStatus;
    /** Ya está anulado: no se toca. */
    alreadyVoided: boolean;
    /** Tiene consumos o ajustes: bloquea la anulación. */
    used: boolean;
    consumedByOrders: string[];
  }>;
  hasLiveMovements: boolean;
  /** Bloquea pedir la anulación. */
  ineligibleReason: string | null;
  /** Bloquea aplicarla hoy, pero no pedirla. */
  applyIssue: string | null;
  pendingRequestId: string | null;
}

/**
 * Anulación de una OG con aprobación del admin.
 *
 * Es la versión en la app de `scripts/delete-paid-expense-order.ts`, pero la
 * OG no se borra: queda en VOIDED con su rastro. Ver `expense-order-void.util.ts`
 * para las reglas y las decisiones del usuario.
 */
@Injectable()
export class ExpenseOrderVoidRequestsService implements OnModuleInit, ApprovalRequestHandler {
  private readonly logger = new Logger(ExpenseOrderVoidRequestsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
    private readonly whatsappService: WhatsappService,
    private readonly approvalRegistry: ApprovalRequestRegistry,
    private readonly supplyLotsService: SupplyLotsService,
  ) {}

  onModuleInit() {
    this.approvalRegistry.register(ApprovalRequestType.EXPENSE_ORDER_VOID, this);
  }

  // ─── Plan ───

  async preview(expenseOrderId: string): Promise<VoidPlan> {
    return this.buildPlan(this.prisma, expenseOrderId, new Date());
  }

  /**
   * Arma el plan con la base que se le pase: fuera de la transacción para la
   * vista previa, dentro (con las filas bloqueadas) al aplicar.
   */
  private async buildPlan(db: Db, expenseOrderId: string, requestedAt: Date): Promise<VoidPlan> {
    const og = await db.expenseOrder.findUnique({
      where: { id: expenseOrderId },
      select: {
        id: true,
        ogNumber: true,
        status: true,
        createdById: true,
        items: { select: { id: true } },
        accountPayable: {
          select: {
            id: true,
            apNumber: true,
            status: true,
            paidAmount: true,
            payments: {
              where: { isReversed: false },
              select: { id: true, cashMovementId: true },
            },
          },
        },
      },
    });
    if (!og) throw new NotFoundException(`OG con id ${expenseOrderId} no encontrada`);

    const ap = og.accountPayable;
    const apMovementIds = (ap?.payments ?? [])
      .map((p) => p.cashMovementId)
      .filter((id): id is string => !!id);

    const movements = await db.cashMovement.findMany({
      where: {
        OR: [
          { referenceType: 'EXPENSE_ORDER', referenceId: og.id },
          ...(apMovementIds.length > 0 ? [{ id: { in: apMovementIds } }] : []),
        ],
        isVoided: false,
        originalMovement: null, // los contramovimientos -ANUL no se tocan
      },
      select: MOVEMENT_SELECT,
      orderBy: { createdAt: 'asc' },
    });
    const movementIds = movements.map((m) => m.id);

    const lots = await db.supplyLot.findMany({
      where: { expenseOrderItemId: { in: og.items.map((i) => i.id) } },
      select: {
        id: true,
        code: true,
        status: true,
        initialQuantity: true,
        remainingQuantity: true,
        consumptions: { select: { order: { select: { orderNumber: true } } } },
        _count: {
          select: { movements: { where: { NOT: { type: 'ENTRY' } } } },
        },
      },
      orderBy: { code: 'asc' },
    });

    const [
      authPending,
      editPending,
      apAuthPending,
      apPaymentPending,
      apReversalPending,
      voidPending,
      transferPending,
      existing,
    ] = await Promise.all([
      db.expenseOrderAuthRequest.count({
        where: { expenseOrderId: og.id, status: EditRequestStatus.PENDING },
      }),
      db.expenseOrderEditRequest.count({
        where: { expenseOrderId: og.id, status: EditRequestStatus.PENDING },
      }),
      ap
        ? db.accountPayableAuthRequest.count({
            where: {
              accountPayableId: ap.id,
              status: EditRequestStatus.PENDING,
            },
          })
        : 0,
      ap
        ? db.accountPayablePaymentAuthRequest.count({
            where: {
              accountPayableId: ap.id,
              status: { in: ['PENDING', 'ADMIN_APPROVED'] },
            },
          })
        : 0,
      ap
        ? db.accountPayablePaymentReversalRequest.count({
            where: {
              paymentAuthRequest: { accountPayableId: ap.id },
              status: { in: ['PENDING_GERENCIA', 'PENDING_CAJA'] },
            },
          })
        : 0,
      movementIds.length > 0
        ? db.cashMovementVoidRequest.count({
            where: {
              cashMovementId: { in: movementIds },
              status: EditRequestStatus.PENDING,
            },
          })
        : 0,
      movementIds.length > 0
        ? db.cashMovementTransferRequest.count({
            where: {
              cashMovementId: { in: movementIds },
              status: EditRequestStatus.PENDING,
            },
          })
        : 0,
      db.expenseOrderVoidRequest.findFirst({
        where: { expenseOrderId: og.id, status: EditRequestStatus.PENDING },
        select: { id: true },
      }),
    ]);

    const movementRows: VoidPlan['movements'] = movements.map((m) => ({
      id: m.id,
      receiptNumber: m.receiptNumber,
      movementType: m.movementType,
      paymentMethod: m.paymentMethod,
      amount: m.amount.toString(),
      createdAt: m.createdAt,
      session: {
        id: m.cashSession.id,
        status: m.cashSession.status,
        cashRegisterName: m.cashSession.cashRegister.name,
        openedAt: m.cashSession.openedAt,
        closedAt: m.cashSession.closedAt,
      },
      blocker: movementVoidBlocker(m, m.cashSession, requestedAt),
      applyIssue: movementApplyIssue(m, m.cashSession),
    }));

    // Cierres que cambian: sesiones cerradas con al menos un egreso en efectivo.
    const closings: VoidPlan['closings'] = [];
    let openSessionsCashChange = new Prisma.Decimal(0);
    const bySession = new Map<string, typeof movements>();
    for (const m of movements) {
      bySession.set(m.cashSession.id, [...(bySession.get(m.cashSession.id) ?? []), m]);
    }
    for (const group of bySession.values()) {
      const session = group[0].cashSession;
      const effect = computeClosingEffectOfVoid(session, group);
      if (session.status === 'OPEN') {
        openSessionsCashChange = openSessionsCashChange.add(
          effect.systemBalanceBefore.sub(effect.systemBalanceAfter).neg(),
        );
        continue;
      }
      if (!session.closedAt || !group.some((m) => m.paymentMethod === 'CASH')) continue;
      closings.push({
        sessionId: session.id,
        cashRegisterName: session.cashRegister.name,
        closedAt: session.closedAt,
        receipts: group.map((m) => m.receiptNumber),
        systemBalanceBefore: effect.systemBalanceBefore.toString(),
        systemBalanceAfter: effect.systemBalanceAfter.toString(),
        discrepancyBefore: effect.discrepancyBefore.toString(),
        discrepancyAfter: effect.discrepancyAfter.toString(),
        worsens: effect.worsens,
        crossesMonth: crossesMonth(session.closedAt, requestedAt),
        monthLabel: monthLabel(session.closedAt),
      });
    }

    const lotRows: VoidPlan['lots'] = lots.map((lot) => {
      const alreadyVoided = lot.status === SupplyLotStatus.VOIDED;
      const used =
        !alreadyVoided &&
        (!ACTIVE_LOT_STATUSES.includes(lot.status) ||
          lot._count.movements > 0 ||
          lot.consumptions.length > 0 ||
          !new Prisma.Decimal(lot.remainingQuantity).equals(lot.initialQuantity));
      return {
        id: lot.id,
        code: lot.code,
        status: lot.status,
        alreadyVoided,
        used,
        consumedByOrders: [...new Set(lot.consumptions.map((c) => c.order.orderNumber))].sort(),
      };
    });

    // Un reintegro aprobado y no recibido: el proveedor tiene una parte del
    // dinero, así que anular la OG supondría que todo volvió a la empresa.
    const refundPending = await db.expenseOrderReductionRequest.count({
      where: {
        expenseOrderId: og.id,
        status: EditRequestStatus.APPROVED,
        moneyLocation: 'SUPPLIER_RETURNS',
        refundReceivedAt: null,
      },
    });

    const ineligibleReason =
      refundPending > 0
        ? 'La OG tiene un reintegro pendiente del proveedor: Caja debe registrarlo antes de anularla.'
        : this.ineligibility({
            status: og.status,
            movements: movementRows,
            lots: lotRows,
            pending: {
              authPending,
              editPending,
              apAuthPending,
              apPaymentPending,
              apReversalPending,
              voidPending,
              transferPending,
            },
          });

    return {
      expenseOrder: {
        id: og.id,
        ogNumber: og.ogNumber,
        status: og.status,
        createdById: og.createdById,
      },
      movements: movementRows,
      closings,
      openSessionsCashChange: openSessionsCashChange.toString(),
      accountPayable: ap
        ? {
            id: ap.id,
            apNumber: ap.apNumber,
            status: ap.status,
            paidAmount: ap.paidAmount.toString(),
            paymentsToReverse: ap.payments.length,
          }
        : null,
      lots: lotRows,
      hasLiveMovements: movements.length > 0,
      ineligibleReason,
      applyIssue: movementRows.find((m) => m.applyIssue)?.applyIssue ?? null,
      pendingRequestId: existing?.id ?? null,
    };
  }

  private ineligibility(input: {
    status: ExpenseOrderStatus;
    movements: VoidPlan['movements'];
    lots: VoidPlan['lots'];
    pending: Record<string, number>;
  }): string | null {
    if (input.status === ExpenseOrderStatus.VOIDED) return 'La OG ya está anulada.';

    const blocked = input.movements.find((m) => m.blocker);
    if (blocked) return blocked.blocker;

    const usedLots = input.lots.filter((l) => l.used);
    if (usedLots.length > 0) {
      const detail = usedLots
        .map((l) =>
          l.consumedByOrders.length > 0
            ? `${l.code} (usado en ${l.consumedByOrders.join(', ')})`
            : l.code,
        )
        .join('; ');
      return (
        `La OG tiene rollos o lotes que ya se usaron: ${detail}. ` +
        'Primero hay que revertir esos consumos.'
      );
    }

    const p = input.pending;
    if (p.authPending > 0)
      return 'La OG tiene una solicitud de autorización pendiente. Resuélvela primero.';
    if (p.editPending > 0)
      return 'La OG tiene una solicitud de edición pendiente. Resuélvela primero.';
    if (p.apAuthPending > 0 || p.apPaymentPending > 0) {
      return 'La cuenta por pagar de la OG tiene una solicitud de autorización o de pago en curso. Resuélvela primero.';
    }
    if (p.apReversalPending > 0) {
      return 'La cuenta por pagar de la OG tiene una reversión de pago en curso. Resuélvela primero.';
    }
    if (p.voidPending > 0 || p.transferPending > 0) {
      return 'Un egreso de la OG tiene una solicitud de anulación o de traslado pendiente. Resuélvela primero.';
    }
    return null;
  }

  // ─── Lectura ───

  async findAllPending(userId: string) {
    await this.assertAdmin(userId);
    const requests = await this.prisma.expenseOrderVoidRequest.findMany({
      where: { status: EditRequestStatus.PENDING },
      include: REQUEST_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
    return this.withPlan(requests);
  }

  async findAll(userId: string) {
    await this.assertAdmin(userId);
    const requests = await this.prisma.expenseOrderVoidRequest.findMany({
      include: REQUEST_INCLUDE,
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
    return this.withPlan(requests);
  }

  async findByExpenseOrder(expenseOrderId: string) {
    return this.prisma.expenseOrderVoidRequest.findMany({
      where: { expenseOrderId },
      include: REQUEST_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
  }

  /** Solicitudes pendientes con el plan calculado hoy (para que el admin decida). */
  private async withPlan(requests: RequestWithRelations[]) {
    return Promise.all(
      requests.map(async (request) => ({
        ...request,
        plan:
          request.status === EditRequestStatus.PENDING
            ? await this.buildPlan(this.prisma, request.expenseOrderId, request.createdAt).catch(
                () => null,
              )
            : null,
      })),
    );
  }

  // ─── Crear ───

  async create(expenseOrderId: string, userId: string, dto: CreateExpenseOrderVoidRequestDto) {
    const reason = dto.reason.trim();
    if (reason.length < MIN_VOID_REASON_LENGTH) {
      throw new BadRequestException(
        `El motivo debe tener al menos ${MIN_VOID_REASON_LENGTH} caracteres`,
      );
    }

    const plan = await this.preview(expenseOrderId);
    if (plan.ineligibleReason) throw new BadRequestException(plan.ineligibleReason);
    if (plan.pendingRequestId) {
      throw new BadRequestException('Ya hay una solicitud de anulación pendiente para esta OG');
    }
    if (plan.hasLiveMovements && dto.cashStayedInDrawer !== true) {
      throw new BadRequestException(
        'Si el dinero salió y lo tiene el proveedor, anular la OG crearía un faltante en caja. ' +
          'No se creó la solicitud: primero hay que recuperar el dinero.',
      );
    }

    const { request, wasDuplicate } = await createOrReturnTwin({
      constraint: PENDING_UNIQUE,
      create: () =>
        this.prisma.expenseOrderVoidRequest.create({
          data: {
            expenseOrderId,
            requestedById: userId,
            reason,
            cashStayedInDrawer: plan.hasLiveMovements ? true : null,
            status: EditRequestStatus.PENDING,
          },
          include: REQUEST_INCLUDE,
        }),
      findTwin: () =>
        this.prisma.expenseOrderVoidRequest.findFirst({
          where: { expenseOrderId, status: EditRequestStatus.PENDING },
          include: REQUEST_INCLUDE,
        }),
    });

    if (wasDuplicate) {
      this.logger.warn(
        `Solicitud de anulación duplicada para la OG ${expenseOrderId}: se devuelve ${request.id} sin notificar de nuevo`,
      );
      return request;
    }

    const label = this.describe(plan);
    await this.notificationsService.notifyAllAdmins({
      type: NotificationType.EXPENSE_ORDER_VOID_REQUEST_PENDING,
      title: 'Nueva solicitud de anulación de OG',
      message: `${this.userName(request.requestedBy)} solicita ${label}`,
      relatedId: request.id,
      relatedType: 'ExpenseOrderVoidRequest',
    });

    void this.notifyAdminsByWhatsApp(request, plan, label);

    return request;
  }

  // ─── Revisar ───

  async approve(requestId: string, reviewerId: string, dto: ReviewExpenseOrderVoidRequestDto) {
    await this.assertReviewer(requestId, reviewerId);
    const applied = await this.applyVoid(requestId, reviewerId, dto.reviewNotes);
    await this.notifyApproved(applied);
    return applied;
  }

  async reject(requestId: string, reviewerId: string, dto: ReviewExpenseOrderVoidRequestDto) {
    await this.assertReviewer(requestId, reviewerId);
    const notes = dto.reviewNotes?.trim();
    if (!notes) throw new BadRequestException('Escribe el motivo del rechazo');

    const claimed = await this.prisma.expenseOrderVoidRequest.updateMany({
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

    const rejected = await this.prisma.expenseOrderVoidRequest.findUniqueOrThrow({
      where: { id: requestId },
      include: REQUEST_INCLUDE,
    });
    await this.notificationsService.create({
      userId: rejected.requestedById,
      type: NotificationType.EXPENSE_ORDER_VOID_REQUEST_REJECTED,
      title: 'Anulación de OG rechazada',
      message: `Se rechazó la anulación de la ${rejected.expenseOrder.ogNumber}. Motivo: ${notes}`,
      relatedId: rejected.id,
      relatedType: 'ExpenseOrderVoidRequest',
    });
    return rejected;
  }

  private async assertAdmin(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: { select: { name: true } } },
    });
    if (user?.role?.name !== 'admin') {
      throw new ForbiddenException('Solo los administradores pueden revisar anulaciones de OG');
    }
  }

  /**
   * Aprueba un admin, y nunca quien la pidió, ni siquiera si es admin
   * (decisión del cliente, 2026-11-20): anular una OG mueve caja e inventario.
   */
  private async assertReviewer(requestId: string, reviewerId: string) {
    const request = await this.prisma.expenseOrderVoidRequest.findUnique({
      where: { id: requestId },
      select: { requestedById: true, status: true },
    });
    if (!request || request.status !== EditRequestStatus.PENDING) {
      throw new NotFoundException('Solicitud de anulación no encontrada o ya fue procesada');
    }
    await this.assertAdmin(reviewerId);
    if (request.requestedById === reviewerId) {
      throw new ForbiddenException(
        'No puedes aprobar ni rechazar una anulación que tú mismo pediste: debe revisarla otro administrador.',
      );
    }
  }

  /**
   * Aplica la anulación en una sola transacción: reclama la solicitud, bloquea
   * la OG y las sesiones, rehace el plan con las filas bloqueadas y lo aplica.
   * Cualquier fallo revierte todo y la solicitud queda pendiente.
   */
  private async applyVoid(requestId: string, reviewerId: string, reviewNotes?: string) {
    return this.prisma.$transaction(
      async (tx) => {
        const now = new Date();

        const claimed = await tx.expenseOrderVoidRequest.updateMany({
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

        const request = await tx.expenseOrderVoidRequest.findUniqueOrThrow({
          where: { id: requestId },
          select: {
            id: true,
            expenseOrderId: true,
            reason: true,
            createdAt: true,
            cashStayedInDrawer: true,
          },
        });

        // Bloqueos: primero la OG (frena a Caja pagándola en el mismo instante),
        // después las sesiones de sus egresos en orden fijo.
        await tx.$queryRaw`SELECT id FROM expense_orders WHERE id = ${request.expenseOrderId} FOR UPDATE`;
        const sessionIds = await tx.cashMovement.findMany({
          where: {
            referenceType: 'EXPENSE_ORDER',
            referenceId: request.expenseOrderId,
            isVoided: false,
          },
          select: { cashSessionId: true },
          distinct: ['cashSessionId'],
        });
        for (const id of sessionIds.map((s) => s.cashSessionId).sort()) {
          await tx.$queryRaw`SELECT id FROM cash_sessions WHERE id = ${id} FOR UPDATE`;
        }

        const plan = await this.buildPlan(tx, request.expenseOrderId, request.createdAt);
        if (plan.ineligibleReason) throw new BadRequestException(plan.ineligibleReason);
        if (plan.applyIssue) throw new BadRequestException(plan.applyIssue);
        if (plan.hasLiveMovements && request.cashStayedInDrawer !== true) {
          // Un egreso apareció después de pedir la anulación sin egresos: nadie
          // declaró qué pasó con ese dinero.
          throw new BadRequestException(
            'La OG tiene egresos que no existían al pedir la anulación. Rechaza esta solicitud y que la pidan de nuevo.',
          );
        }

        const og = plan.expenseOrder;
        const voidReason = `Anulación de ${og.ogNumber}: ${request.reason}`;
        const fecha = formatBusinessDateTime(now);
        const audits: Prisma.AuditLogCreateManyInput[] = [];

        // 1. Egresos de caja.
        for (const m of plan.movements) {
          const { count } = await tx.cashMovement.updateMany({
            where: { id: m.id, isVoided: false },
            data: {
              isVoided: true,
              voidedById: reviewerId,
              voidedAt: now,
              voidReason,
            },
          });
          if (count !== 1)
            throw new ConflictException(
              `${m.receiptNumber} cambió mientras se aplicaba la anulación`,
            );
          audits.push({
            userId: reviewerId,
            recordId: m.id,
            action: 'UPDATE',
            model: 'CashMovement',
            oldData: { isVoided: false },
            newData: {
              isVoided: true,
              voidedAt: now.toISOString(),
              voidReason,
            },
            changedFields: ['isVoided', 'voidedById', 'voidedAt', 'voidReason'],
            metadata: { expenseOrderVoidRequestId: request.id },
          });
        }

        // 2. Cierres de sesiones ya cerradas: se recalculan desde lo guardado.
        for (const closing of plan.closings) {
          const session = await tx.cashSession.findUniqueOrThrow({
            where: { id: closing.sessionId },
            select: { notes: true },
          });
          const note =
            `[Anulación ${fecha}] ${closing.receipts.join(', ')} de la ${og.ogNumber}: ${request.reason}. ` +
            `Esperado ${formatCop(closing.systemBalanceBefore)} → ${formatCop(closing.systemBalanceAfter)}; ` +
            `diferencia ${formatSignedCop(closing.discrepancyBefore)} → ${formatSignedCop(closing.discrepancyAfter)}.`;
          const notes = session.notes ? `${session.notes}\n${note}` : note;
          await tx.cashSession.update({
            where: { id: closing.sessionId },
            data: {
              systemBalance: new Prisma.Decimal(closing.systemBalanceAfter),
              discrepancy: new Prisma.Decimal(closing.discrepancyAfter),
              notes,
            },
            select: { id: true },
          });
          audits.push({
            userId: reviewerId,
            recordId: closing.sessionId,
            action: 'UPDATE',
            model: 'CashSession',
            oldData: {
              systemBalance: closing.systemBalanceBefore,
              discrepancy: closing.discrepancyBefore,
              notes: session.notes,
            },
            newData: {
              systemBalance: closing.systemBalanceAfter,
              discrepancy: closing.discrepancyAfter,
              notes,
            },
            changedFields: ['systemBalance', 'discrepancy', 'notes'],
            metadata: {
              expenseOrderVoidRequestId: request.id,
              editedAfterSessionClose: true,
              voidedReceipts: closing.receipts,
            },
          });
        }

        // 3. Cuenta por pagar: abonos revertidos y la CP anulada.
        if (plan.accountPayable && plan.accountPayable.status !== AccountPayableStatus.CANCELLED) {
          const ap = plan.accountPayable;
          await tx.accountPayablePayment.updateMany({
            where: { accountPayableId: ap.id, isReversed: false },
            data: { isReversed: true, reversedAt: now },
          });
          await tx.accountPayable.update({
            where: { id: ap.id },
            data: {
              status: AccountPayableStatus.CANCELLED,
              paidAmount: 0,
              balance: 0,
              cancelledAt: now,
              cancelledById: reviewerId,
              cancelReason: voidReason,
            },
            select: { id: true },
          });
          audits.push({
            userId: reviewerId,
            recordId: ap.id,
            action: 'UPDATE',
            model: 'AccountPayable',
            oldData: { status: ap.status, paidAmount: ap.paidAmount },
            newData: {
              status: AccountPayableStatus.CANCELLED,
              paidAmount: '0',
              cancelReason: voidReason,
            },
            changedFields: [
              'status',
              'paidAmount',
              'balance',
              'cancelledAt',
              'cancelledById',
              'cancelReason',
            ],
            metadata: {
              expenseOrderVoidRequestId: request.id,
              reversedPayments: ap.paymentsToReverse,
            },
          });
        }

        // 4. Rollos sin consumos (los usados ya bloquearon el plan).
        const voidedLots: string[] = [];
        for (const lot of plan.lots.filter((l) => !l.alreadyVoided)) {
          await this.supplyLotsService.voidInTransaction(tx, lot.id, voidReason, reviewerId);
          voidedLots.push(lot.code);
        }

        // 5. La OG.
        const voided = await tx.expenseOrder.updateMany({
          where: { id: og.id, status: { not: ExpenseOrderStatus.VOIDED } },
          data: {
            status: ExpenseOrderStatus.VOIDED,
            voidedById: reviewerId,
            voidedAt: now,
            voidReason: request.reason,
          },
        });
        if (voided.count !== 1)
          throw new ConflictException('La OG cambió mientras se aplicaba la anulación');
        audits.push({
          userId: reviewerId,
          recordId: og.id,
          action: 'UPDATE',
          model: 'ExpenseOrder',
          oldData: { status: og.status },
          newData: {
            status: ExpenseOrderStatus.VOIDED,
            voidReason: request.reason,
          },
          changedFields: ['status', 'voidedById', 'voidedAt', 'voidReason'],
          metadata: { expenseOrderVoidRequestId: request.id, voidedLots },
        });

        const appliedEffect = {
          previousStatus: og.status,
          voidedMovements: plan.movements.map((m) => ({
            receiptNumber: m.receiptNumber,
            amount: m.amount,
            paymentMethod: m.paymentMethod,
            sessionStatus: m.session.status,
          })),
          closings: plan.closings,
          openSessionsCashChange: plan.openSessionsCashChange,
          accountPayable: plan.accountPayable,
          voidedLots,
        };
        await tx.expenseOrderVoidRequest.update({
          where: { id: request.id },
          data: {
            appliedEffect: appliedEffect as unknown as Prisma.InputJsonValue,
            appliedAt: now,
          },
          select: { id: true },
        });
        await tx.auditLog.createMany({ data: audits });

        return tx.expenseOrderVoidRequest.findUniqueOrThrow({
          where: { id: request.id },
          include: REQUEST_INCLUDE,
        });
      },
      { timeout: 30_000, maxWait: 10_000 },
    );
  }

  // ─── Mensajes ───

  private userName(user: {
    firstName: string | null;
    lastName: string | null;
    email: string | null;
  }) {
    return [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email || 'Un usuario';
  }

  /** «anular la OG-2026-1224 (1 egreso por $109.585, CP-2026-1711)» */
  private describe(plan: VoidPlan): string {
    const total = plan.movements.reduce((acc, m) => acc.add(m.amount), new Prisma.Decimal(0));
    const parts: string[] = [];
    if (plan.movements.length > 0) {
      parts.push(
        `${plan.movements.length} egreso${plan.movements.length === 1 ? '' : 's'} por ${formatCop(total)}`,
      );
    }
    if (plan.accountPayable) parts.push(plan.accountPayable.apNumber);
    const lots = plan.lots.filter((l) => !l.alreadyVoided).length;
    if (lots > 0) parts.push(`${lots} rollo${lots === 1 ? '' : 's'}`);
    return `anular la ${plan.expenseOrder.ogNumber}${parts.length ? ` (${parts.join(', ')})` : ''}`;
  }

  private async notifyAdminsByWhatsApp(
    request: RequestWithRelations,
    plan: VoidPlan,
    label: string,
  ) {
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
      const closings = plan.closings
        .map(
          (c) =>
            ` Cierre del ${formatBusinessDateTime(c.closedAt)}: ${formatSignedCop(c.discrepancyBefore)} → ` +
            `${formatSignedCop(c.discrepancyAfter)}${c.worsens ? ' (empeora)' : ''}.`,
        )
        .join('');

      const results = await Promise.allSettled(
        phones.map((telefono) =>
          this.whatsappService.sendApprovalNotification({
            telefono,
            requesterName: requester ? this.userName(requester) : 'Usuario',
            requesterRole: requester?.role?.name || 'usuario',
            actionDescription: `${label.charAt(0).toUpperCase()}${label.slice(1)}.${closings}`,
            reason: request.reason,
            requestId: request.id,
            requestType: ApprovalRequestType.EXPENSE_ORDER_VOID,
          }),
        ),
      );
      const { sent, failed } = countWhatsappDeliveries(results);
      this.logger.log(
        `WhatsApp de la anulación ${request.id}: ${sent} enviados, ${failed} fallidos`,
      );
    } catch (error) {
      this.logger.error(
        `Error enviando WhatsApp de la anulación ${request.id}: ${(error as Error).message}`,
      );
    }
  }

  private async notifyApproved(request: RequestWithRelations) {
    const recipients = new Set([request.requestedById, request.expenseOrder.createdById]);
    await Promise.all(
      [...recipients].map((userId) =>
        this.notificationsService.create({
          userId,
          type: NotificationType.EXPENSE_ORDER_VOID_REQUEST_APPROVED,
          title: 'OG anulada',
          message: `La ${request.expenseOrder.ogNumber} quedó anulada: sus egresos de caja y su cuenta por pagar también.`,
          relatedId: request.id,
          relatedType: 'ExpenseOrderVoidRequest',
        }),
      ),
    );
  }

  // ─── ApprovalRequestHandler (WhatsApp) ───

  async findPendingRequest(requestId: string): Promise<ApprovalRequestInfo | null> {
    const request = await this.prisma.expenseOrderVoidRequest.findUnique({
      where: { id: requestId },
      include: REQUEST_INCLUDE,
    });
    if (!request) return null;
    return {
      id: request.id,
      status: request.status,
      requestedById: request.requestedById,
      displayLabel: `la anulación de la ${request.expenseOrder.ogNumber}`,
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
    const request = await this.prisma.expenseOrderVoidRequest.findUnique({
      where: { id: requestId },
      select: { expenseOrderId: true },
    });
    return request?.expenseOrderId ?? null;
  }
}
