import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  OnModuleInit,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { WhatsappService } from '../whatsapp/whatsapp.service';
import { WsEventsGateway } from '../ws-events/ws-events.gateway';
import {
  ApprovalRequestHandler,
  ApprovalRequestInfo,
  ApprovalRequestRegistry,
} from '../whatsapp/approval-request-registry';
import {
  ApproveAdvancePaymentApprovalDto,
  RejectAdvancePaymentApprovalDto,
} from './dto';
import { ApprovalRequestType, EditRequestStatus, NotificationType, Prisma } from '../../generated/prisma';

const USER_SELECT = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
} as const;

@Injectable()
export class AdvancePaymentApprovalsService implements OnModuleInit, ApprovalRequestHandler {
  private readonly logger = new Logger(AdvancePaymentApprovalsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
    private readonly approvalRegistry: ApprovalRequestRegistry,
    private readonly whatsappService: WhatsappService,
    private readonly wsEventsGateway: WsEventsGateway,
  ) {}

  onModuleInit() {
    this.approvalRegistry.register('ADVANCE_PAYMENT', this);
  }

  // ─── ApprovalRequestHandler interface ───

  async findPendingRequest(requestId: string): Promise<ApprovalRequestInfo | null> {
    const request = await this.prisma.advancePaymentApproval.findUnique({
      where: { id: requestId },
      include: { order: { select: { orderNumber: true } } },
    });
    if (!request) return null;
    return {
      id: request.id,
      status: request.status,
      requestedById: request.requestedById,
      displayLabel: `aprobación de anticipo - Orden ${request.order.orderNumber}`,
    };
  }

  async approveViaWhatsApp(requestId: string, reviewerId: string): Promise<void> {
    const request = await this.prisma.advancePaymentApproval.update({
      where: { id: requestId },
      data: {
        status: EditRequestStatus.APPROVED,
        reviewedById: reviewerId,
        reviewedAt: new Date(),
        reviewNotes: 'Aprobado vía WhatsApp',
      },
      include: { order: { select: { id: true, orderNumber: true } } },
    });

    await this.prisma.order.update({
      where: { id: request.orderId },
      data: { advancePaymentStatus: EditRequestStatus.APPROVED },
    });

    await this.notificationsService.create({
      userId: request.requestedById,
      type: NotificationType.ADVANCE_PAYMENT_APPROVAL_APPROVED,
      title: 'Anticipo aprobado',
      message: `El anticipo de la orden ${request.order.orderNumber} ha sido aprobado. Ya puedes cambiar el estado de la orden.`,
      relatedId: request.orderId,
      relatedType: 'Order',
    });

    this.wsEventsGateway.emitApprovalUpdated(request);
  }

  async rejectViaWhatsApp(requestId: string, reviewerId: string): Promise<void> {
    const request = await this.prisma.advancePaymentApproval.findFirst({
      where: { id: requestId, status: EditRequestStatus.PENDING },
      include: {
        order: { select: { id: true, orderNumber: true, total: true } },
        payment: { select: { id: true, amount: true } },
      },
    });

    if (!request) return;

    await this.prisma.advancePaymentApproval.update({
      where: { id: requestId },
      data: {
        status: EditRequestStatus.REJECTED,
        reviewedById: reviewerId,
        reviewedAt: new Date(),
        reviewNotes: 'Rechazado vía WhatsApp',
      },
    });

    // Eliminar pago y revertir montos
    await this.prisma.payment.delete({
      where: { id: request.paymentId },
    });

    const orderTotal = new Prisma.Decimal(request.order.total);
    await this.prisma.order.update({
      where: { id: request.orderId },
      data: {
        advancePaymentStatus: EditRequestStatus.REJECTED,
        advancePaymentRejectedReason: 'Rechazado vía WhatsApp',
        paidAmount: new Prisma.Decimal(0),
        balance: orderTotal,
      },
    });

    await this.notificationsService.create({
      userId: request.requestedById,
      type: NotificationType.ADVANCE_PAYMENT_APPROVAL_REJECTED,
      title: 'Anticipo rechazado',
      message: `El anticipo de la orden ${request.order.orderNumber} ha sido rechazado. El pago ha sido eliminado.`,
      relatedId: request.orderId,
      relatedType: 'Order',
    });

    this.wsEventsGateway.emitApprovalUpdated({ id: requestId, status: 'REJECTED', orderId: request.orderId });
  }

  /**
   * Busca reviewer por teléfono validando permiso approve_advance_payments.
   */
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
            some: { permission: { name: 'approve_advance_payments' } },
          },
        },
      },
      select: { id: true },
    });
  }

  // ─── Domain methods ───

  /**
   * Verificar si el usuario requiere aprobación de anticipo
   */
  async requiresApproval(userId: string): Promise<{ required: boolean; reason?: string }> {
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

    // Si el usuario tiene permiso approve_advance_payments, no requiere aprobación
    const hasPermission = user?.role?.permissions?.some(
      (rp) => rp.permission.name === 'approve_advance_payments',
    );

    if (hasPermission) {
      return { required: false };
    }

    return {
      required: true,
      reason: 'El anticipo requiere aprobación de Caja',
    };
  }

  /**
   * Crear solicitud de aprobación de anticipo (llamado automáticamente al crear orden)
   */
  async createFromOrderCreation(
    userId: string,
    orderId: string,
    paymentId: string,
    paymentLabel: string = 'anticipo',
  ) {
    const [order, user, payment] = await Promise.all([
      this.prisma.order.findUnique({
        where: { id: orderId },
        select: { id: true, orderNumber: true },
      }),
      this.prisma.user.findUnique({
        where: { id: userId },
        select: USER_SELECT,
      }),
      this.prisma.payment.findUnique({
        where: { id: paymentId },
        select: { amount: true, paymentMethod: true },
      }),
    ]);

    if (!order) {
      throw new NotFoundException(`Orden con id ${orderId} no encontrada`);
    }

    // Crear solicitud
    const request = await this.prisma.advancePaymentApproval.create({
      data: {
        orderId,
        paymentId,
        requestedById: userId,
        status: EditRequestStatus.PENDING,
      },
      include: {
        requestedBy: { select: USER_SELECT },
        order: { select: { id: true, orderNumber: true } },
      },
    });

    // Actualizar estado de anticipo en la orden
    await this.prisma.order.update({
      where: { id: orderId },
      data: { advancePaymentStatus: EditRequestStatus.PENDING },
    });

    // Formatear monto y método para los mensajes
    const amountFormatted = payment
      ? `$${Number(payment.amount).toLocaleString('es-CO')}`
      : '';
    const methodLabel = payment
      ? this.formatPaymentMethod(payment.paymentMethod)
      : '';
    const paymentDetail =
      payment ? ` de ${amountFormatted} vía ${methodLabel}` : '';

    // Notificar a usuarios con permiso approve_advance_payments (in-app)
    await this.notificationsService.notifyUsersWithPermission(
      'approve_advance_payments',
      {
        type: NotificationType.ADVANCE_PAYMENT_APPROVAL_PENDING,
        title: `Nueva solicitud de aprobación de ${paymentLabel}`,
        message: `${user?.firstName || user?.email} solicita aprobación del ${paymentLabel}${paymentDetail} de la orden ${order.orderNumber}`,
        relatedId: request.id,
        relatedType: 'AdvancePaymentApproval',
      },
    );

    // Notificar por WhatsApp a usuarios con permiso (fire & forget)
    const requesterName =
      [user?.firstName, user?.lastName].filter(Boolean).join(' ') ||
      user?.email ||
      'Usuario';

    this.notifyReviewersByWhatsApp(
      request.id,
      requesterName,
      `aprobación del ${paymentLabel}${paymentDetail} de la orden ${order.orderNumber}`,
      `El ${paymentLabel} requiere aprobación de Caja`,
    );

    // Emitir evento WebSocket en tiempo real
    const fullRequest = await this.prisma.advancePaymentApproval.findUnique({
      where: { id: request.id },
      include: {
        requestedBy: { select: USER_SELECT },
        order: {
          select: {
            id: true,
            orderNumber: true,
            status: true,
            total: true,
            paidAmount: true,
            client: {
              select: { id: true, name: true },
            },
          },
        },
        payment: { select: { id: true, amount: true, paymentMethod: true, reference: true, notes: true } },
      },
    });
    if (fullRequest) {
      this.wsEventsGateway.emitApprovalCreated(fullRequest);
    }

    return request;
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

  /**
   * Aprobar solicitud
   */
  async approve(
    requestId: string,
    reviewerId: string,
    dto: ApproveAdvancePaymentApprovalDto,
  ) {
    // 1. Validar que solicitud existe y está PENDING
    const request = await this.prisma.advancePaymentApproval.findFirst({
      where: { id: requestId, status: EditRequestStatus.PENDING },
      include: {
        requestedBy: { select: USER_SELECT },
        order: { select: { id: true, orderNumber: true } },
      },
    });

    if (!request) {
      throw new NotFoundException('Solicitud no encontrada o ya procesada');
    }

    // 2. Validar que revisor tiene permiso
    await this.validateReviewerPermission(reviewerId);

    // 3. Actualizar solicitud a APPROVED
    const updatedRequest = await this.prisma.advancePaymentApproval.update({
      where: { id: requestId },
      data: {
        status: EditRequestStatus.APPROVED,
        reviewedById: reviewerId,
        reviewedAt: new Date(),
        reviewNotes: dto.reviewNotes,
      },
      include: {
        requestedBy: { select: USER_SELECT },
        reviewedBy: { select: USER_SELECT },
        order: { select: { id: true, orderNumber: true } },
      },
    });

    // 4. Actualizar estado de anticipo en la orden
    await this.prisma.order.update({
      where: { id: request.orderId },
      data: { advancePaymentStatus: EditRequestStatus.APPROVED },
    });

    // 5. Notificar al solicitante
    await this.notificationsService.create({
      userId: request.requestedById,
      type: NotificationType.ADVANCE_PAYMENT_APPROVAL_APPROVED,
      title: 'Anticipo aprobado',
      message: `El anticipo de la orden ${request.order.orderNumber} ha sido aprobado. Ya puedes cambiar el estado de la orden.`,
      relatedId: request.orderId,
      relatedType: 'Order',
    });

    // 6. Emitir evento WebSocket
    this.wsEventsGateway.emitApprovalUpdated(updatedRequest);

    return updatedRequest;
  }

  /**
   * Rechazar solicitud — elimina el pago y revierte paidAmount/balance
   */
  async reject(
    requestId: string,
    reviewerId: string,
    dto: RejectAdvancePaymentApprovalDto,
  ) {
    // 1. Validar que solicitud existe y está PENDING
    const request = await this.prisma.advancePaymentApproval.findFirst({
      where: { id: requestId, status: EditRequestStatus.PENDING },
      include: {
        requestedBy: { select: USER_SELECT },
        order: { select: { id: true, orderNumber: true, total: true } },
        payment: { select: { id: true, amount: true } },
      },
    });

    if (!request) {
      throw new NotFoundException('Solicitud no encontrada o ya procesada');
    }

    // 2. Validar que revisor tiene permiso
    await this.validateReviewerPermission(reviewerId);

    // 3. Actualizar solicitud a REJECTED
    await this.prisma.advancePaymentApproval.update({
      where: { id: requestId },
      data: {
        status: EditRequestStatus.REJECTED,
        reviewedById: reviewerId,
        reviewedAt: new Date(),
        reviewNotes: dto.reviewNotes,
      },
    });

    // 4. Eliminar el pago y revertir montos en la orden
    await this.prisma.payment.delete({
      where: { id: request.paymentId },
    });

    const orderTotal = new Prisma.Decimal(request.order.total);
    await this.prisma.order.update({
      where: { id: request.orderId },
      data: {
        advancePaymentStatus: EditRequestStatus.REJECTED,
        advancePaymentRejectedReason: dto.reviewNotes ?? null,
        paidAmount: new Prisma.Decimal(0),
        balance: orderTotal,
      },
    });

    // 5. Notificar al solicitante
    const rejectReason = dto.reviewNotes ? ` Motivo: ${dto.reviewNotes}` : '';
    await this.notificationsService.create({
      userId: request.requestedById,
      type: NotificationType.ADVANCE_PAYMENT_APPROVAL_REJECTED,
      title: 'Anticipo rechazado',
      message: `El anticipo de la orden ${request.order.orderNumber} ha sido rechazado. El pago ha sido eliminado y el saldo actualizado.${rejectReason}`,
      relatedId: request.orderId,
      relatedType: 'Order',
    });

    // 6. Emitir evento WebSocket
    this.wsEventsGateway.emitApprovalUpdated({ id: requestId, status: 'REJECTED', orderId: request.orderId });

    // Re-fetch para retornar datos actualizados
    return this.prisma.advancePaymentApproval.findUnique({
      where: { id: requestId },
      include: {
        requestedBy: { select: USER_SELECT },
        reviewedBy: { select: USER_SELECT },
        order: { select: { id: true, orderNumber: true } },
      },
    });
  }

  /**
   * Obtener solicitudes pendientes (para dashboard de aprobación)
   */
  async findPendingRequests() {
    return this.prisma.advancePaymentApproval.findMany({
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
            client: {
              select: { id: true, name: true },
            },
          },
        },
        payment: { select: { id: true, amount: true, paymentMethod: true, reference: true, notes: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Obtener todas las solicitudes (auditoría)
   */
  async findAll() {
    return this.prisma.advancePaymentApproval.findMany({
      include: {
        requestedBy: { select: USER_SELECT },
        reviewedBy: { select: USER_SELECT },
        order: { select: { id: true, orderNumber: true, status: true } },
        payment: { select: { id: true, amount: true, paymentMethod: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Obtener solicitudes propias del usuario
   */
  async findByUser(userId: string) {
    return this.prisma.advancePaymentApproval.findMany({
      where: { requestedById: userId },
      include: {
        reviewedBy: { select: USER_SELECT },
        order: { select: { id: true, orderNumber: true, status: true } },
        payment: { select: { id: true, amount: true, paymentMethod: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Validar que el usuario tiene permiso approve_advance_payments
   */
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
      (rp) => rp.permission.name === 'approve_advance_payments',
    );

    if (!hasPermission) {
      throw new ForbiddenException(
        'Solo usuarios con permiso de aprobación de anticipos pueden aprobar/rechazar solicitudes',
      );
    }
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
              some: { permission: { name: 'approve_advance_payments' } },
            },
          },
        },
        select: { phone: true },
      });

      if (usersWithPermission.length === 0) {
        this.logger.warn(
          'No active users with approve_advance_payments permission and phone found for WhatsApp notification',
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
            requestType: ApprovalRequestType.ADVANCE_PAYMENT,
          }),
        ),
      );

      const fulfilled = results.filter((r) => r.status === 'fulfilled').length;
      const rejected = results.filter((r) => r.status === 'rejected').length;

      this.logger.log(
        `WhatsApp notifications for advance payment approval ${requestId}: ${fulfilled} sent, ${rejected} failed`,
      );
    } catch (error) {
      this.logger.error(
        `Error sending WhatsApp notifications: ${error.message}`,
      );
    }
  }
}
