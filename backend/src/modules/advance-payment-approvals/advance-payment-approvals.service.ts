import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import {
  ApproveAdvancePaymentApprovalDto,
  RejectAdvancePaymentApprovalDto,
} from './dto';
import { EditRequestStatus, NotificationType, Prisma } from '../../generated/prisma';

const USER_SELECT = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
} as const;

@Injectable()
export class AdvancePaymentApprovalsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

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
  ) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: { id: true, orderNumber: true },
    });

    if (!order) {
      throw new NotFoundException(`Orden con id ${orderId} no encontrada`);
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: USER_SELECT,
    });

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

    // Notificar a usuarios con permiso approve_advance_payments
    await this.notificationsService.notifyUsersWithPermission(
      'approve_advance_payments',
      {
        type: NotificationType.ADVANCE_PAYMENT_APPROVAL_PENDING,
        title: 'Nueva solicitud de aprobación de anticipo',
        message: `${user?.firstName || user?.email} solicita aprobación del anticipo de la orden ${order.orderNumber}`,
        relatedId: request.id,
        relatedType: 'AdvancePaymentApproval',
      },
    );

    return request;
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
        order: { select: { id: true, orderNumber: true, status: true, total: true, paidAmount: true } },
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
}
