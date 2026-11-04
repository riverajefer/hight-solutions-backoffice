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
import { assertNotSelfReview } from '../../common/utils/self-review.util';
import { NotificationsService } from '../notifications/notifications.service';
import { WhatsappService } from '../whatsapp/whatsapp.service';
import { countWhatsappDeliveries } from '../whatsapp/whatsapp-notification.util';
import {
  ApprovalRequestHandler,
  ApprovalRequestInfo,
  ApprovalRequestRegistry,
} from '../whatsapp/approval-request-registry';
import {
  ApprovalRequestType,
  EditRequestStatus,
  NotificationType,
  Prisma,
} from '../../generated/prisma';
import { CreateTransferRequestDto, ReviewTransferRequestDto } from './dto';
import {
  MIN_TRANSFER_REASON_LENGTH,
  computeSourceClosingEffect,
  crossesMonth,
  formatBusinessDateTime,
  formatCop,
  formatSignedCop,
  monthLabel,
  transferIneligibilityReason,
} from './cash-movement-transfer.util';

const PENDING_UNIQUE = 'cash_movement_transfer_requests_pending_movement_unique';

const USER_SELECT = { id: true, email: true, firstName: true, lastName: true } as const;

/** Lo que el servicio necesita de un movimiento para decidir y describir. */
const MOVEMENT_SELECT = {
  id: true,
  receiptNumber: true,
  movementType: true,
  paymentMethod: true,
  amount: true,
  description: true,
  referenceType: true,
  referenceId: true,
  isVoided: true,
  counterMovementId: true,
  createdAt: true,
  cashSessionId: true,
  originalMovement: { select: { id: true } },
  cashSession: {
    select: {
      id: true,
      status: true,
      cashRegisterId: true,
      openedAt: true,
      closedAt: true,
      openingAmount: true,
      closingAmount: true,
      systemBalance: true,
      discrepancy: true,
      cashRegister: { select: { id: true, name: true } },
    },
  },
} satisfies Prisma.CashMovementSelect;

type MovementForTransfer = Prisma.CashMovementGetPayload<{ select: typeof MOVEMENT_SELECT }>;

const REQUEST_INCLUDE = {
  requestedBy: { select: USER_SELECT },
  reviewedBy: { select: USER_SELECT },
  cashMovement: {
    select: {
      id: true,
      receiptNumber: true,
      movementType: true,
      paymentMethod: true,
      amount: true,
      description: true,
      referenceType: true,
      referenceId: true,
      createdAt: true,
    },
  },
  sourceSession: {
    select: {
      id: true,
      openedAt: true,
      closedAt: true,
      closingAmount: true,
      systemBalance: true,
      discrepancy: true,
      cashRegister: { select: { id: true, name: true } },
    },
  },
  targetSession: { select: { id: true, openedAt: true, status: true } },
} satisfies Prisma.CashMovementTransferRequestInclude;

type RequestWithRelations = Prisma.CashMovementTransferRequestGetPayload<{
  include: typeof REQUEST_INCLUDE;
}>;

export interface TransferPreview {
  movement: {
    id: string;
    receiptNumber: string;
    movementType: string;
    paymentMethod: string;
    amount: string;
    description: string;
    createdAt: Date;
    expenseOrder: { id: string; ogNumber: string } | null;
  };
  sourceSession: {
    id: string;
    cashRegisterName: string;
    openedAt: Date;
    closedAt: Date | null;
  };
  targetSession: { id: string; openedAt: Date } | null;
  /** Nulo si el movimiento no se puede trasladar. */
  effect: {
    systemBalanceBefore: string;
    systemBalanceAfter: string;
    discrepancyBefore: string;
    discrepancyAfter: string;
    worsens: boolean;
    /** Cuánto cambia lo que espera la sesión destino (+ más efectivo, − menos). */
    targetExpectedChange: string;
  } | null;
  /** Bloquea pedir el traslado. */
  ineligibleReason: string | null;
  /** Bloquea aplicarlo hoy, pero no pedirlo (puede abrirse la caja después). */
  targetIssue: string | null;
  crossesMonth: boolean;
  sourceMonthLabel: string | null;
  pendingRequestId: string | null;
  appliedRequestId: string | null;
}

/**
 * Solicitudes para trasladar un movimiento en efectivo de una sesión cerrada
 * a la abierta de la misma caja, recalculando el cierre de origen.
 *
 * Es la versión en la app de `scripts/move-movements-to-open-session.ts`,
 * con aprobación del admin. Ver docs/PROPUESTA_TRASLADO_MOVIMIENTOS_CAJA.md.
 */
@Injectable()
export class CashMovementTransferRequestsService
  implements OnModuleInit, ApprovalRequestHandler
{
  private readonly logger = new Logger(CashMovementTransferRequestsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
    private readonly whatsappService: WhatsappService,
    private readonly approvalRegistry: ApprovalRequestRegistry,
  ) {}

  onModuleInit() {
    this.approvalRegistry.register(ApprovalRequestType.CASH_MOVEMENT_TRANSFER, this);
  }

  // ─── Lectura ───

  private async loadMovement(
    db: Prisma.TransactionClient | PrismaService,
    movementId: string,
  ): Promise<MovementForTransfer> {
    const movement = await db.cashMovement.findUnique({
      where: { id: movementId },
      select: MOVEMENT_SELECT,
    });
    if (!movement) {
      throw new NotFoundException(`Movimiento de caja ${movementId} no encontrado`);
    }
    return movement;
  }

  private async findOpenTargetSession(cashRegisterId: string) {
    return this.prisma.cashSession.findFirst({
      where: { cashRegisterId, status: 'OPEN' },
      orderBy: { openedAt: 'desc' },
      select: { id: true, openedAt: true, countStartedAt: true },
    });
  }

  private targetIssueFor(
    source: { closedAt: Date | null },
    target: { openedAt: Date; countStartedAt: Date | null } | null,
  ): string | null {
    if (!target) {
      return 'No hay una sesión abierta en esta caja. El traslado se aplica cuando el admin lo apruebe con la caja abierta.';
    }
    if (target.countStartedAt) {
      return 'La caja de hoy está en arqueo. Espera a que termine o se cancele el conteo.';
    }
    if (source.closedAt && target.openedAt <= source.closedAt) {
      return 'La sesión abierta empezó antes del cierre de origen.';
    }
    return null;
  }

  private async expenseOrderRef(movement: { referenceType: string | null; referenceId: string | null }) {
    if (movement.referenceType !== 'EXPENSE_ORDER' || !movement.referenceId) return null;
    return this.prisma.expenseOrder.findUnique({
      where: { id: movement.referenceId },
      select: { id: true, ogNumber: true },
    });
  }

  private async hasPendingVoidRequest(movementId: string): Promise<boolean> {
    const found = await this.prisma.cashMovementVoidRequest.findFirst({
      where: { cashMovementId: movementId, status: EditRequestStatus.PENDING },
      select: { id: true },
    });
    return !!found;
  }

  async preview(movementId: string, now = new Date()): Promise<TransferPreview> {
    const movement = await this.loadMovement(this.prisma, movementId);
    const source = movement.cashSession;

    const [target, existing, expenseOrder, pendingVoid] = await Promise.all([
      this.findOpenTargetSession(source.cashRegisterId),
      this.prisma.cashMovementTransferRequest.findMany({
        where: {
          cashMovementId: movementId,
          status: { in: [EditRequestStatus.PENDING, EditRequestStatus.APPROVED] },
        },
        select: { id: true, status: true },
      }),
      this.expenseOrderRef(movement),
      this.hasPendingVoidRequest(movementId),
    ]);

    const applied = existing.find((r) => r.status === EditRequestStatus.APPROVED);
    const pending = existing.find((r) => r.status === EditRequestStatus.PENDING);

    let ineligibleReason = transferIneligibilityReason(
      { ...movement, isReversal: !!movement.originalMovement },
      source,
      now,
    );
    if (!ineligibleReason && applied) {
      ineligibleReason = 'Este movimiento ya se trasladó una vez.';
    }
    if (!ineligibleReason && pendingVoid) {
      ineligibleReason = 'El movimiento tiene una solicitud de anulación pendiente.';
    }

    const eligible = !ineligibleReason;
    const effect = eligible ? computeSourceClosingEffect(source, movement) : null;

    return {
      movement: {
        id: movement.id,
        receiptNumber: movement.receiptNumber,
        movementType: movement.movementType,
        paymentMethod: movement.paymentMethod,
        amount: movement.amount.toString(),
        description: movement.description,
        createdAt: movement.createdAt,
        expenseOrder,
      },
      sourceSession: {
        id: source.id,
        cashRegisterName: source.cashRegister.name,
        openedAt: source.openedAt,
        closedAt: source.closedAt,
      },
      targetSession: target ? { id: target.id, openedAt: target.openedAt } : null,
      effect: effect && {
        systemBalanceBefore: effect.systemBalanceBefore.toString(),
        systemBalanceAfter: effect.systemBalanceAfter.toString(),
        discrepancyBefore: effect.discrepancyBefore.toString(),
        discrepancyAfter: effect.discrepancyAfter.toString(),
        worsens: effect.worsens,
        targetExpectedChange: effect.systemBalanceBefore.sub(effect.systemBalanceAfter).toString(),
      },
      ineligibleReason,
      targetIssue: eligible ? this.targetIssueFor(source, target) : null,
      crossesMonth: !!source.closedAt && crossesMonth(source.closedAt, now),
      sourceMonthLabel: source.closedAt ? monthLabel(source.closedAt) : null,
      pendingRequestId: pending?.id ?? null,
      appliedRequestId: applied?.id ?? null,
    };
  }

  /** Solicitudes con el efecto calculado hoy (para que el admin decida). */
  private async withPreview(requests: RequestWithRelations[]) {
    return Promise.all(
      requests.map(async (request) => ({
        ...request,
        preview:
          request.status === EditRequestStatus.PENDING
            ? await this.preview(request.cashMovementId, request.createdAt).catch(() => null)
            : null,
      })),
    );
  }

  async findAllPending() {
    const requests = await this.prisma.cashMovementTransferRequest.findMany({
      where: { status: EditRequestStatus.PENDING },
      include: REQUEST_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
    return this.withPreview(requests);
  }

  async findAll() {
    const requests = await this.prisma.cashMovementTransferRequest.findMany({
      include: REQUEST_INCLUDE,
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
    return this.withPreview(requests);
  }

  /** Traslados que salieron de la sesión o entraron a ella. */
  async findBySession(sessionId: string) {
    return this.prisma.cashMovementTransferRequest.findMany({
      where: {
        OR: [{ sourceSessionId: sessionId }, { targetSessionId: sessionId }],
        status: { in: [EditRequestStatus.APPROVED, EditRequestStatus.PENDING] },
      },
      include: REQUEST_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Egresos en efectivo de una OG, cada uno con si se puede trasladar.
   * Alimenta el botón «El proveedor no recibió el pago» del detalle de la OG.
   */
  async findExpenseOrderMovements(expenseOrderId: string, now = new Date()) {
    const movements = await this.prisma.cashMovement.findMany({
      where: {
        referenceType: 'EXPENSE_ORDER',
        referenceId: expenseOrderId,
        paymentMethod: 'CASH',
        originalMovement: null,
      },
      select: { id: true },
      orderBy: { createdAt: 'asc' },
    });
    return Promise.all(movements.map((m) => this.preview(m.id, now)));
  }

  // ─── Crear ───

  async create(movementId: string, userId: string, dto: CreateTransferRequestDto) {
    if (!dto.cashStayedInDrawer) {
      throw new BadRequestException(
        'Si el dinero no se quedó en la caja, esto no es un traslado: es un faltante ' +
          'de ese día y hay que investigarlo. No se creó la solicitud.',
      );
    }
    const reason = dto.reason.trim();
    if (reason.length < MIN_TRANSFER_REASON_LENGTH) {
      throw new BadRequestException(
        `El motivo debe tener al menos ${MIN_TRANSFER_REASON_LENGTH} caracteres`,
      );
    }

    const preview = await this.preview(movementId);
    if (preview.ineligibleReason) {
      throw new BadRequestException(preview.ineligibleReason);
    }
    if (preview.pendingRequestId) {
      throw new BadRequestException('Ya hay una solicitud de traslado pendiente para este movimiento');
    }

    const { request, wasDuplicate } = await createOrReturnTwin({
      constraint: PENDING_UNIQUE,
      create: () =>
        this.prisma.cashMovementTransferRequest.create({
          data: {
            cashMovementId: movementId,
            sourceSessionId: preview.sourceSession.id,
            requestedById: userId,
            reason,
            cashStayedInDrawer: true,
            status: EditRequestStatus.PENDING,
          },
          include: REQUEST_INCLUDE,
        }),
      findTwin: () =>
        this.prisma.cashMovementTransferRequest.findFirst({
          where: { cashMovementId: movementId, status: EditRequestStatus.PENDING },
          include: REQUEST_INCLUDE,
        }),
    });

    if (wasDuplicate) {
      this.logger.warn(
        `Solicitud de traslado duplicada para el movimiento ${movementId}: se devuelve ${request.id} sin notificar de nuevo`,
      );
      return request;
    }

    const label = this.describe(request, preview);
    await this.notificationsService.notifyAllAdmins({
      type: NotificationType.CASH_TRANSFER_REQUEST_PENDING,
      title: 'Nueva solicitud de traslado de caja',
      message: `${this.userName(request.requestedBy)} solicita ${label}`,
      relatedId: request.id,
      relatedType: 'CashMovementTransferRequest',
    });

    void this.notifyAdminsByWhatsApp(request, label);

    return request;
  }

  // ─── Revisar ───

  async approve(requestId: string, reviewerId: string, dto: ReviewTransferRequestDto) {
    await this.assertReviewer(requestId, reviewerId);
    const applied = await this.applyTransfer(requestId, reviewerId, dto.reviewNotes);
    await this.notifyRequesterApproved(applied);
    return applied;
  }

  async reject(requestId: string, reviewerId: string, dto: ReviewTransferRequestDto) {
    await this.assertReviewer(requestId, reviewerId);
    const notes = dto.reviewNotes?.trim();
    if (!notes) {
      throw new BadRequestException('Escribe el motivo del rechazo');
    }
    const rejected = await this.markRejected(requestId, reviewerId, notes);
    await this.notifyRequesterRejected(rejected);
    return rejected;
  }

  /** Solo el admin aprueba (decisión del cliente, 2026-11-04). */
  private async assertReviewer(requestId: string, reviewerId: string) {
    const [request, reviewer] = await Promise.all([
      this.prisma.cashMovementTransferRequest.findUnique({
        where: { id: requestId },
        select: { requestedById: true, status: true },
      }),
      this.prisma.user.findUnique({
        where: { id: reviewerId },
        select: { role: { select: { name: true } } },
      }),
    ]);
    if (!request || request.status !== EditRequestStatus.PENDING) {
      throw new NotFoundException('Solicitud de traslado no encontrada o ya fue procesada');
    }
    if (reviewer?.role?.name !== 'admin') {
      throw new ForbiddenException('Solo los administradores pueden revisar traslados de caja');
    }
    await assertNotSelfReview(this.prisma, {
      requestedById: request.requestedById,
      reviewerId,
    });
  }

  private async markRejected(requestId: string, reviewerId: string, notes: string) {
    const claimed = await this.prisma.cashMovementTransferRequest.updateMany({
      where: { id: requestId, status: EditRequestStatus.PENDING },
      data: {
        status: EditRequestStatus.REJECTED,
        reviewedById: reviewerId,
        reviewedAt: new Date(),
        reviewNotes: notes,
      },
    });
    if (claimed.count === 0) {
      throw new ConflictException('La solicitud ya fue procesada por otra persona');
    }
    return this.prisma.cashMovementTransferRequest.findUniqueOrThrow({
      where: { id: requestId },
      include: REQUEST_INCLUDE,
    });
  }

  /**
   * Aplica el traslado en una sola transacción: reclama la solicitud, bloquea
   * las dos sesiones, revalida todo, mueve el movimiento y recalcula el cierre.
   * Cualquier fallo revierte todo y la solicitud queda pendiente.
   */
  private async applyTransfer(requestId: string, reviewerId: string, reviewNotes?: string) {
    return this.prisma.$transaction(
      async (tx) => {
        const now = new Date();

        const claimed = await tx.cashMovementTransferRequest.updateMany({
          where: { id: requestId, status: EditRequestStatus.PENDING },
          data: {
            status: EditRequestStatus.APPROVED,
            reviewedById: reviewerId,
            reviewedAt: now,
            reviewNotes: reviewNotes?.trim() || null,
          },
        });
        if (claimed.count === 0) {
          throw new ConflictException('La solicitud ya fue procesada por otra persona');
        }

        const request = await tx.cashMovementTransferRequest.findUniqueOrThrow({
          where: { id: requestId },
          select: { id: true, cashMovementId: true, sourceSessionId: true, reason: true, createdAt: true },
        });

        // Bloqueo de la sesión de origen: dos traslados aprobados a la vez
        // partirían del mismo esperado guardado y uno pisaría al otro.
        await tx.$queryRaw`SELECT id FROM cash_sessions WHERE id = ${request.sourceSessionId} FOR UPDATE`;

        const movement = await this.loadMovement(tx, request.cashMovementId);
        const source = movement.cashSession;
        if (source.id !== request.sourceSessionId) {
          throw new ConflictException('El movimiento ya no está en la sesión de origen de la solicitud');
        }

        // El plazo se cuenta al pedir, no al aprobar: un admin que tarda un día
        // no debe hacer vencer una solicitud que llegó a tiempo.
        const ineligible = transferIneligibilityReason(
          { ...movement, isReversal: !!movement.originalMovement },
          source,
          request.createdAt,
        );
        if (ineligible) throw new BadRequestException(ineligible);

        const targetRows = await tx.$queryRaw<{ id: string }[]>`
          SELECT id FROM cash_sessions
          WHERE cash_register_id = ${source.cashRegisterId} AND status = 'OPEN'
          ORDER BY opened_at DESC
          LIMIT 1
          FOR UPDATE`;
        const target = targetRows[0]
          ? await tx.cashSession.findUnique({
              where: { id: targetRows[0].id },
              select: { id: true, openedAt: true, countStartedAt: true, status: true },
            })
          : null;
        const targetIssue = this.targetIssueFor(source, target);
        if (targetIssue || !target) {
          throw new BadRequestException(targetIssue ?? 'No hay una sesión abierta en esta caja');
        }

        const effect = computeSourceClosingEffect(source, movement);
        const fecha = formatBusinessDateTime(now);
        const closedAtLabel = formatBusinessDateTime(source.closedAt!);

        const description =
          `${movement.description} [Trasladado el ${fecha} desde la sesión cerrada del ` +
          `${closedAtLabel}: ${request.reason}]`;
        const moved = await tx.cashMovement.updateMany({
          where: { id: movement.id, cashSessionId: source.id, isVoided: false },
          data: { cashSessionId: target.id, description },
        });
        if (moved.count === 0) {
          throw new ConflictException('El movimiento cambió mientras se aplicaba el traslado');
        }

        const currentNotes = await tx.cashSession.findUniqueOrThrow({
          where: { id: source.id },
          select: { notes: true },
        });
        const sessionNote =
          `[Traslado ${fecha}] ${movement.receiptNumber} (${formatSignedCop(effectOnDrawer(effect))} ` +
          `en efectivo) pasó a la sesión abierta el ${formatBusinessDateTime(target.openedAt)}: ` +
          `${request.reason}. Esperado ${formatCop(effect.systemBalanceBefore)} → ` +
          `${formatCop(effect.systemBalanceAfter)}; diferencia ` +
          `${formatSignedCop(effect.discrepancyBefore)} → ${formatSignedCop(effect.discrepancyAfter)}.`;
        const notes = currentNotes.notes ? `${currentNotes.notes}\n${sessionNote}` : sessionNote;

        await tx.cashSession.update({
          where: { id: source.id },
          data: {
            systemBalance: effect.systemBalanceAfter,
            discrepancy: effect.discrepancyAfter,
            notes,
          },
          select: { id: true },
        });

        await tx.cashMovementTransferRequest.update({
          where: { id: request.id },
          data: {
            targetSessionId: target.id,
            sourceSystemBalanceBefore: effect.systemBalanceBefore,
            sourceSystemBalanceAfter: effect.systemBalanceAfter,
            sourceDiscrepancyBefore: effect.discrepancyBefore,
            sourceDiscrepancyAfter: effect.discrepancyAfter,
            appliedAt: now,
          },
          select: { id: true },
        });

        await tx.auditLog.createMany({
          data: [
            {
              userId: reviewerId,
              recordId: movement.id,
              action: 'UPDATE',
              model: 'CashMovement',
              oldData: { cashSessionId: source.id, description: movement.description },
              newData: { cashSessionId: target.id, description },
              changedFields: ['cashSessionId', 'description'],
              metadata: { transferRequestId: request.id, reason: request.reason },
            },
            {
              userId: reviewerId,
              recordId: source.id,
              action: 'UPDATE',
              model: 'CashSession',
              oldData: {
                systemBalance: effect.systemBalanceBefore.toString(),
                discrepancy: effect.discrepancyBefore.toString(),
                notes: currentNotes.notes,
              },
              newData: {
                systemBalance: effect.systemBalanceAfter.toString(),
                discrepancy: effect.discrepancyAfter.toString(),
                notes,
              },
              changedFields: ['systemBalance', 'discrepancy', 'notes'],
              metadata: {
                transferRequestId: request.id,
                editedAfterSessionClose: true,
                movedReceipts: [movement.receiptNumber],
                targetSessionId: target.id,
              },
            },
          ],
        });

        return tx.cashMovementTransferRequest.findUniqueOrThrow({
          where: { id: request.id },
          include: REQUEST_INCLUDE,
        });
      },
      { timeout: 20_000, maxWait: 10_000 },
    );
  }

  // ─── Mensajes ───

  private userName(user: { firstName: string | null; lastName: string | null; email: string | null }) {
    return [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email || 'Un usuario';
  }

  /** «trasladar RC-2026-5969 (egreso de $2.000, OG-2026-0890) del cierre del 27/10/26 a la caja de hoy» */
  private describe(
    request: Pick<RequestWithRelations, 'cashMovement' | 'sourceSession'>,
    preview?: TransferPreview | null,
  ): string {
    const m = request.cashMovement;
    const kind = m.movementType === 'INCOME' || m.movementType === 'DEPOSIT' ? 'ingreso' : 'egreso';
    const og = preview?.movement.expenseOrder?.ogNumber;
    const closed = request.sourceSession.closedAt
      ? ` del cierre del ${formatBusinessDateTime(request.sourceSession.closedAt)}`
      : '';
    return `trasladar ${m.receiptNumber} (${kind} de ${formatCop(m.amount)}${og ? `, ${og}` : ''})${closed} a la caja de hoy`;
  }

  private async notifyAdminsByWhatsApp(request: RequestWithRelations, label: string) {
    try {
      const phones = await this.whatsappService.getAdminPhones();
      if (phones.length === 0) return;

      const requester = await this.prisma.user.findUnique({
        where: { id: request.requestedById },
        select: { firstName: true, lastName: true, email: true, role: { select: { name: true } } },
      });
      const preview = await this.preview(request.cashMovementId, request.createdAt).catch(() => null);
      const effect = preview?.effect
        ? ` Cierre de ese día: ${formatSignedCop(preview.effect.discrepancyBefore)} → ` +
          `${formatSignedCop(preview.effect.discrepancyAfter)}${preview.effect.worsens ? ' (empeora)' : ''}.`
        : '';
      const month = preview?.crossesMonth ? ` Cambia el arqueo de ${preview.sourceMonthLabel}.` : '';

      const results = await Promise.allSettled(
        phones.map((telefono) =>
          this.whatsappService.sendApprovalNotification({
            telefono,
            requesterName: requester ? this.userName(requester) : 'Usuario',
            requesterRole: requester?.role?.name || 'usuario',
            actionDescription: `${label.charAt(0).toUpperCase()}${label.slice(1)}.${effect}${month}`,
            reason: request.reason,
            requestId: request.id,
            requestType: ApprovalRequestType.CASH_MOVEMENT_TRANSFER,
          }),
        ),
      );
      const { sent, failed } = countWhatsappDeliveries(results);
      this.logger.log(`WhatsApp del traslado ${request.id}: ${sent} enviados, ${failed} fallidos`);
    } catch (error) {
      this.logger.error(`Error enviando WhatsApp del traslado ${request.id}: ${(error as Error).message}`);
    }
  }

  private async notifyRequesterApproved(request: RequestWithRelations) {
    const isExpense =
      request.cashMovement.movementType === 'EXPENSE' || request.cashMovement.movementType === 'WITHDRAWAL';
    const reminder = isExpense
      ? ' Cuando entregues el dinero, sube el comprobante del pago.'
      : '';
    await this.notificationsService.create({
      userId: request.requestedById,
      type: NotificationType.CASH_TRANSFER_REQUEST_APPROVED,
      title: 'Traslado de caja aprobado',
      message: `${request.cashMovement.receiptNumber} ya está en la caja de hoy.${reminder}`,
      relatedId: request.id,
      relatedType: 'CashMovementTransferRequest',
    });
  }

  private async notifyRequesterRejected(request: RequestWithRelations) {
    await this.notificationsService.create({
      userId: request.requestedById,
      type: NotificationType.CASH_TRANSFER_REQUEST_REJECTED,
      title: 'Traslado de caja rechazado',
      message: `Se rechazó el traslado de ${request.cashMovement.receiptNumber}.${
        request.reviewNotes ? ` Motivo: ${request.reviewNotes}` : ''
      }`,
      relatedId: request.id,
      relatedType: 'CashMovementTransferRequest',
    });
  }

  // ─── ApprovalRequestHandler (WhatsApp) ───

  async findPendingRequest(requestId: string): Promise<ApprovalRequestInfo | null> {
    const request = await this.prisma.cashMovementTransferRequest.findUnique({
      where: { id: requestId },
      include: REQUEST_INCLUDE,
    });
    if (!request) return null;
    return {
      id: request.id,
      status: request.status,
      requestedById: request.requestedById,
      displayLabel: `el traslado de ${request.cashMovement.receiptNumber} a la caja de hoy`,
    };
  }

  async approveViaWhatsApp(requestId: string, reviewerId: string): Promise<void> {
    await this.approve(requestId, reviewerId, { reviewNotes: 'Aprobado vía WhatsApp' });
  }

  async rejectViaWhatsApp(requestId: string, reviewerId: string): Promise<void> {
    await this.reject(requestId, reviewerId, { reviewNotes: 'Rechazado vía WhatsApp' });
  }

  async getEntityId(requestId: string): Promise<string | null> {
    const request = await this.prisma.cashMovementTransferRequest.findUnique({
      where: { id: requestId },
      select: { sourceSessionId: true },
    });
    return request?.sourceSessionId ?? null;
  }
}

/** Efecto del movimiento en el cajón: −$2.000 para un egreso, +$2.000 para un ingreso. */
function effectOnDrawer(effect: { systemBalanceBefore: Prisma.Decimal; systemBalanceAfter: Prisma.Decimal }) {
  return effect.systemBalanceBefore.sub(effect.systemBalanceAfter);
}
