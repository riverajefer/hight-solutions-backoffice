import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
  OnModuleInit,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { WhatsappService } from '../whatsapp/whatsapp.service';
import { WsEventsGateway } from '../ws-events/ws-events.gateway';
import { ConsecutivesService } from '../consecutives/consecutives.service';
import {
  ApprovalRequestHandler,
  ApprovalRequestInfo,
  ApprovalRequestRegistry,
} from '../whatsapp/approval-request-registry';
import {
  CreateRefundRequestDto,
  ApproveRefundRequestDto,
  RejectRefundRequestDto,
} from './dto';
import {
  ApprovalRequestType,
  EditRequestStatus,
  NotificationType,
  Prisma,
} from '../../generated/prisma';

const USER_SELECT = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
} as const;

const ORDER_SELECT = {
  id: true,
  orderNumber: true,
  status: true,
  total: true,
  paidAmount: true,
  balance: true,
} as const;

@Injectable()
export class RefundRequestsService
  implements OnModuleInit, ApprovalRequestHandler
{
  private readonly logger = new Logger(RefundRequestsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
    private readonly approvalRegistry: ApprovalRequestRegistry,
    private readonly whatsappService: WhatsappService,
    private readonly wsEventsGateway: WsEventsGateway,
    private readonly consecutivesService: ConsecutivesService,
  ) {}

  onModuleInit() {
    this.approvalRegistry.register('REFUND_REQUEST', this);
  }

  // ─── ApprovalRequestHandler interface ───

  async findPendingRequest(
    requestId: string,
  ): Promise<ApprovalRequestInfo | null> {
    const request = await this.prisma.refundRequest.findUnique({
      where: { id: requestId },
      include: { order: { select: { orderNumber: true } } },
    });
    if (!request) return null;
    return {
      id: request.id,
      status: request.status,
      requestedById: request.requestedById,
      displayLabel: `solicitud de devolución - Orden ${request.order.orderNumber}`,
    };
  }

  async approveViaWhatsApp(
    requestId: string,
    reviewerId: string,
  ): Promise<void> {
    await this.approve(requestId, reviewerId, {
      reviewNotes: 'Aprobado vía WhatsApp',
    });
  }

  async rejectViaWhatsApp(
    requestId: string,
    reviewerId: string,
  ): Promise<void> {
    await this.reject(requestId, reviewerId, {
      reviewNotes: 'Rechazado vía WhatsApp',
    });
  }

  async findReviewerByPhone(phone: string): Promise<{ id: string } | null> {
    const clean = phone.replace(/[^\d]/g, '');
    const variants = [
      clean,
      `+${clean}`,
      clean.startsWith('57') ? clean.slice(2) : null,
    ].filter(Boolean) as string[];

    return this.prisma.user.findFirst({
      where: {
        isActive: true,
        phone: { in: variants },
        role: {
          permissions: {
            some: { permission: { name: 'approve_refunds' } },
          },
        },
      },
      select: { id: true },
    });
  }

  // ─── Domain methods ───

  /**
   * Crear solicitud de devolución de dinero al cliente (saldo a favor).
   * No mueve dinero hasta ser aprobada.
   */
  async create(userId: string, dto: CreateRefundRequestDto) {
    const order = await this.prisma.order.findUnique({
      where: { id: dto.orderId },
      select: ORDER_SELECT,
    });

    if (!order) {
      throw new NotFoundException(`Orden con id ${dto.orderId} no encontrada`);
    }

    // Validar que no exista otra solicitud pendiente para la misma orden
    const existingPending = await this.prisma.refundRequest.findFirst({
      where: {
        orderId: dto.orderId,
        status: EditRequestStatus.PENDING,
      },
      select: { id: true },
    });

    if (existingPending) {
      throw new ConflictException(
        'Ya existe una solicitud de devolución pendiente para esta orden',
      );
    }

    // Calcular saldo a favor: paidAmount - total
    const paidAmount = new Prisma.Decimal(order.paidAmount);
    const total = new Prisma.Decimal(order.total);
    const overpayment = paidAmount.sub(total);

    if (overpayment.lessThanOrEqualTo(0)) {
      throw new BadRequestException(
        'La orden no tiene saldo a favor para devolver',
      );
    }

    const refundAmount = new Prisma.Decimal(dto.refundAmount);
    if (refundAmount.greaterThan(overpayment)) {
      throw new BadRequestException(
        `El monto a devolver (${refundAmount.toString()}) no puede exceder el saldo a favor (${overpayment.toString()})`,
      );
    }

    // Crear la solicitud
    const request = await this.prisma.refundRequest.create({
      data: {
        orderId: dto.orderId,
        refundAmount,
        paymentMethod: dto.paymentMethod,
        observation: dto.observation,
        status: EditRequestStatus.PENDING,
        requestedById: userId,
      },
      include: {
        requestedBy: { select: USER_SELECT },
        order: { select: ORDER_SELECT },
      },
    });

    // Notificar in-app a usuarios con approve_refunds
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: USER_SELECT,
    });

    const amountFormatted = `$${Number(refundAmount).toLocaleString('es-CO')}`;
    const methodLabel = this.formatPaymentMethod(dto.paymentMethod);

    await this.notificationsService.notifyUsersWithPermission(
      'approve_refunds',
      {
        type: NotificationType.REFUND_REQUEST_PENDING,
        title: 'Nueva solicitud de devolución',
        message: `${user?.firstName || user?.email} solicita devolver ${amountFormatted} vía ${methodLabel} de la orden ${order.orderNumber}. Observación: ${dto.observation}`,
        relatedId: request.id,
        relatedType: 'RefundRequest',
      },
    );

    // Notificar por WhatsApp (fire & forget)
    const requesterName =
      [user?.firstName, user?.lastName].filter(Boolean).join(' ') ||
      user?.email ||
      'Usuario';

    this.notifyReviewersByWhatsApp(
      request.id,
      requesterName,
      `devolución de ${amountFormatted} vía ${methodLabel} de la orden ${order.orderNumber}`,
      `Observación: ${dto.observation}`,
    );

    // Emitir WS
    this.wsEventsGateway.emitApprovalCreated(request);

    return request;
  }

  /**
   * Aprobar: crea CashMovement EXPENSE y reduce paidAmount.
   */
  async approve(
    requestId: string,
    reviewerId: string,
    dto: ApproveRefundRequestDto,
  ) {
    const request = await this.prisma.refundRequest.findFirst({
      where: { id: requestId, status: EditRequestStatus.PENDING },
      include: {
        requestedBy: { select: USER_SELECT },
        order: {
          select: {
            id: true,
            orderNumber: true,
            total: true,
            paidAmount: true,
            balance: true,
          },
        },
      },
    });

    if (!request) {
      throw new NotFoundException('Solicitud no encontrada o ya procesada');
    }

    await this.validateReviewerPermission(reviewerId);

    // Verificar sesión de caja abierta
    const activeSession = await this.prisma.cashSession.findFirst({
      where: { status: 'OPEN' },
      select: { id: true },
    });

    if (!activeSession) {
      throw new BadRequestException(
        'No hay sesión de caja abierta para registrar la devolución',
      );
    }

    // Verificar que el saldo a favor sigue existiendo y es suficiente
    const paidAmount = new Prisma.Decimal(request.order.paidAmount);
    const total = new Prisma.Decimal(request.order.total);
    const overpayment = paidAmount.sub(total);
    const refundAmount = new Prisma.Decimal(request.refundAmount);

    if (refundAmount.greaterThan(overpayment)) {
      throw new BadRequestException(
        'El saldo a favor actual es insuficiente para aprobar la devolución',
      );
    }

    const receiptNumber =
      await this.consecutivesService.generateNumber('CASH_RECEIPT');

    const updated = await this.prisma.$transaction(async (tx) => {
      // 1. Crear CashMovement EXPENSE
      const movement = await tx.cashMovement.create({
        data: {
          cashSessionId: activeSession.id,
          receiptNumber,
          movementType: 'EXPENSE',
          paymentMethod: request.paymentMethod,
          amount: refundAmount,
          description: `Devolución Orden ${request.order.orderNumber} — ${request.observation}`,
          referenceType: 'REFUND',
          referenceId: request.id,
          performedById: reviewerId,
        },
        select: { id: true },
      });

      // 2. Ajustar paidAmount y balance de la OP
      const newPaidAmount = paidAmount.sub(refundAmount);
      const newBalance = total.sub(newPaidAmount);

      await tx.order.update({
        where: { id: request.orderId },
        data: {
          paidAmount: newPaidAmount,
          balance: newBalance,
        },
      });

      // 3. Actualizar la solicitud a APPROVED
      return tx.refundRequest.update({
        where: { id: requestId },
        data: {
          status: EditRequestStatus.APPROVED,
          reviewedById: reviewerId,
          reviewedAt: new Date(),
          reviewNotes: dto.reviewNotes,
          executedAt: new Date(),
          cashMovementId: movement.id,
        },
        include: {
          requestedBy: { select: USER_SELECT },
          reviewedBy: { select: USER_SELECT },
          order: { select: ORDER_SELECT },
          cashMovement: {
            select: {
              id: true,
              receiptNumber: true,
              amount: true,
              paymentMethod: true,
              movementType: true,
            },
          },
        },
      });
    });

    // Notificar al solicitante
    await this.notificationsService.create({
      userId: request.requestedById,
      type: NotificationType.REFUND_REQUEST_APPROVED,
      title: 'Devolución aprobada',
      message: `La devolución de la orden ${request.order.orderNumber} ha sido aprobada y registrada en caja.`,
      relatedId: request.orderId,
      relatedType: 'Order',
    });

    this.wsEventsGateway.emitApprovalUpdated(updated);

    return updated;
  }

  /**
   * Rechazar: solo actualiza estado, sin efectos financieros.
   */
  async reject(
    requestId: string,
    reviewerId: string,
    dto: RejectRefundRequestDto,
  ) {
    const request = await this.prisma.refundRequest.findFirst({
      where: { id: requestId, status: EditRequestStatus.PENDING },
      include: {
        requestedBy: { select: USER_SELECT },
        order: { select: { id: true, orderNumber: true } },
      },
    });

    if (!request) {
      throw new NotFoundException('Solicitud no encontrada o ya procesada');
    }

    await this.validateReviewerPermission(reviewerId);

    await this.prisma.refundRequest.update({
      where: { id: requestId },
      data: {
        status: EditRequestStatus.REJECTED,
        reviewedById: reviewerId,
        reviewedAt: new Date(),
        reviewNotes: dto.reviewNotes,
      },
    });

    const rejectReason = dto.reviewNotes ? ` Motivo: ${dto.reviewNotes}` : '';
    await this.notificationsService.create({
      userId: request.requestedById,
      type: NotificationType.REFUND_REQUEST_REJECTED,
      title: 'Devolución rechazada',
      message: `La devolución de la orden ${request.order.orderNumber} ha sido rechazada.${rejectReason}`,
      relatedId: request.orderId,
      relatedType: 'Order',
    });

    this.wsEventsGateway.emitApprovalUpdated({
      id: requestId,
      status: 'REJECTED',
      orderId: request.orderId,
    });

    return this.prisma.refundRequest.findUnique({
      where: { id: requestId },
      include: {
        requestedBy: { select: USER_SELECT },
        reviewedBy: { select: USER_SELECT },
        order: { select: ORDER_SELECT },
      },
    });
  }

  async findPendingRequests() {
    return this.prisma.refundRequest.findMany({
      where: { status: EditRequestStatus.PENDING },
      include: {
        requestedBy: { select: USER_SELECT },
        order: {
          select: {
            id: true,
            orderNumber: true,
            status: true,
            total: true,
            paidAmount: true,
            balance: true,
            client: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findAll() {
    return this.prisma.refundRequest.findMany({
      include: {
        requestedBy: { select: USER_SELECT },
        reviewedBy: { select: USER_SELECT },
        order: { select: ORDER_SELECT },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const request = await this.prisma.refundRequest.findUnique({
      where: { id },
      include: {
        requestedBy: { select: USER_SELECT },
        reviewedBy: { select: USER_SELECT },
        order: { select: ORDER_SELECT },
        cashMovement: {
          select: {
            id: true,
            receiptNumber: true,
            amount: true,
            paymentMethod: true,
            movementType: true,
            createdAt: true,
          },
        },
      },
    });

    if (!request) {
      throw new NotFoundException(
        `Solicitud de devolución ${id} no encontrada`,
      );
    }

    return request;
  }

  async findByUser(userId: string) {
    return this.prisma.refundRequest.findMany({
      where: { requestedById: userId },
      include: {
        reviewedBy: { select: USER_SELECT },
        order: { select: ORDER_SELECT },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findByOrder(orderId: string) {
    return this.prisma.refundRequest.findMany({
      where: { orderId },
      include: {
        requestedBy: { select: USER_SELECT },
        reviewedBy: { select: USER_SELECT },
        cashMovement: {
          select: {
            id: true,
            receiptNumber: true,
            amount: true,
            paymentMethod: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  private async validateReviewerPermission(userId: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        role: {
          include: {
            permissions: {
              include: { permission: true },
            },
          },
        },
      },
    });

    const hasPermission = user?.role?.permissions?.some(
      (rp) => rp.permission.name === 'approve_refunds',
    );

    if (!hasPermission) {
      throw new ForbiddenException(
        'Solo usuarios con permiso approve_refunds pueden aprobar/rechazar devoluciones',
      );
    }
  }

  private formatPaymentMethod(method: string): string {
    const labels: Record<string, string> = {
      CASH: 'Efectivo',
      TRANSFER: 'Transferencia',
      CARD: 'Tarjeta',
      CHECK: 'Cheque',
      CREDIT: 'Crédito',
      OTHER: 'Otro',
    };
    return labels[method] ?? method;
  }

  private async notifyReviewersByWhatsApp(
    requestId: string,
    requesterName: string,
    actionDescription: string,
    reason: string,
  ): Promise<void> {
    try {
      const usersWithPermission = await this.prisma.user.findMany({
        where: {
          isActive: true,
          phone: { not: null },
          role: {
            permissions: {
              some: { permission: { name: 'approve_refunds' } },
            },
          },
        },
        select: { phone: true },
      });

      if (usersWithPermission.length === 0) {
        this.logger.warn(
          'No active users with approve_refunds permission and phone found for WhatsApp notification',
        );
        return;
      }

      const results = await Promise.allSettled(
        usersWithPermission.map((user) =>
          this.whatsappService.sendApprovalNotification({
            telefono: user.phone!,
            requesterName,
            requesterRole: 'vendedor',
            actionDescription,
            reason,
            requestId,
            requestType: ApprovalRequestType.REFUND_REQUEST,
          }),
        ),
      );

      const fulfilled = results.filter((r) => r.status === 'fulfilled').length;
      const rejected = results.filter((r) => r.status === 'rejected').length;

      this.logger.log(
        `WhatsApp notifications for refund request ${requestId}: ${fulfilled} sent, ${rejected} failed`,
      );
    } catch (error) {
      this.logger.error(
        `Error sending WhatsApp notifications: ${error.message}`,
      );
    }
  }
}
