import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import {
  CreateStatusChangeRequestDto,
  ApproveStatusChangeRequestDto,
  RejectStatusChangeRequestDto,
} from './dto';
import {
  EditRequestStatus,
  NotificationType,
  OrderStatus,
} from '../../generated/prisma';

@Injectable()
export class OrderStatusChangeRequestsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  /**
   * Crear solicitud de cambio de estado
   */
  async create(userId: string, dto: CreateStatusChangeRequestDto) {
    // 1. Validar que orden existe
    const order = await this.prisma.order.findUnique({
      where: { id: dto.orderId },
    });

    if (!order) {
      throw new NotFoundException(`Order with id ${dto.orderId} not found`);
    }

    // 2. Validar que el estado actual coincide
    if (order.status !== dto.currentStatus) {
      throw new BadRequestException(
        `Current order status is ${order.status}, not ${dto.currentStatus}`,
      );
    }

    // 3. Validar que usuario NO es admin (admins pueden cambiar directamente)
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { role: true },
    });

    if (user?.role?.name === 'admin') {
      throw new BadRequestException(
        'Administrators can change order status directly without requesting permission',
      );
    }

    // 4. Validar que no hay solicitud PENDING del mismo usuario para el mismo cambio
    const existingRequest =
      await this.prisma.orderStatusChangeRequest.findFirst({
        where: {
          orderId: dto.orderId,
          requestedById: userId,
          requestedStatus: dto.requestedStatus,
          status: EditRequestStatus.PENDING,
        },
      });

    if (existingRequest) {
      throw new BadRequestException(
        'You already have a pending status change request for this order',
      );
    }

    // 5. Crear solicitud
    const request = await this.prisma.orderStatusChangeRequest.create({
      data: {
        orderId: dto.orderId,
        requestedById: userId,
        currentStatus: dto.currentStatus,
        requestedStatus: dto.requestedStatus,
        reason: dto.reason,
        status: EditRequestStatus.PENDING,
      },
      include: {
        requestedBy: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        order: {
          select: {
            id: true,
            orderNumber: true,
          },
        },
      },
    });

    // 6. Notificar a todos los administradores
    await this.notificationsService.notifyAllAdmins({
      type: NotificationType.STATUS_CHANGE_REQUEST_PENDING,
      title: 'Nueva solicitud de cambio de estado',
      message: `${request.requestedBy.firstName || request.requestedBy.email} solicita cambiar la orden ${request.order.orderNumber} de ${dto.currentStatus} a ${dto.requestedStatus}`,
      relatedId: request.id,
      relatedType: 'OrderStatusChangeRequest',
    });

    return request;
  }

  /**
   * Aprobar solicitud
   */
  async approve(
    requestId: string,
    adminId: string,
    dto: ApproveStatusChangeRequestDto,
  ) {
    // 1. Validar que solicitud existe y está PENDING
    const request = await this.prisma.orderStatusChangeRequest.findFirst({
      where: {
        id: requestId,
        status: EditRequestStatus.PENDING,
      },
      include: {
        requestedBy: true,
        order: {
          select: { orderNumber: true, status: true },
        },
      },
    });

    if (!request) {
      throw new NotFoundException(
        'Status change request not found or already processed',
      );
    }

    // 2. Validar que revisor es admin
    const admin = await this.prisma.user.findUnique({
      where: { id: adminId },
      include: { role: true },
    });

    if (admin?.role?.name !== 'admin') {
      throw new ForbiddenException('Only administrators can approve requests');
    }

    // 3. Validar que el estado de la orden no cambió desde la solicitud
    if (request.order.status !== request.currentStatus) {
      throw new BadRequestException(
        `Order status has changed from ${request.currentStatus} to ${request.order.status}. Request is no longer valid.`,
      );
    }

    // 4. Actualizar solicitud
    const updatedRequest = await this.prisma.orderStatusChangeRequest.update({
      where: { id: requestId },
      data: {
        status: EditRequestStatus.APPROVED,
        reviewedById: adminId,
        reviewedAt: new Date(),
        reviewNotes: dto.reviewNotes,
      },
      include: {
        requestedBy: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        reviewedBy: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    // 5. Notificar al solicitante
    await this.notificationsService.create({
      userId: request.requestedById,
      type: NotificationType.STATUS_CHANGE_REQUEST_APPROVED,
      title: 'Solicitud de cambio de estado aprobada',
      message: `Tu solicitud para cambiar la orden ${request.order.orderNumber} a ${request.requestedStatus} ha sido aprobada.`,
      relatedId: request.orderId,
      relatedType: 'Order',
    });

    return updatedRequest;
  }

  /**
   * Rechazar solicitud
   */
  async reject(
    requestId: string,
    adminId: string,
    dto: RejectStatusChangeRequestDto,
  ) {
    // 1. Validar que solicitud existe y está PENDING
    const request = await this.prisma.orderStatusChangeRequest.findFirst({
      where: {
        id: requestId,
        status: EditRequestStatus.PENDING,
      },
      include: {
        requestedBy: true,
        order: {
          select: { orderNumber: true },
        },
      },
    });

    if (!request) {
      throw new NotFoundException(
        'Status change request not found or already processed',
      );
    }

    // 2. Validar que revisor es admin
    const admin = await this.prisma.user.findUnique({
      where: { id: adminId },
      include: { role: true },
    });

    if (admin?.role?.name !== 'admin') {
      throw new ForbiddenException('Only administrators can reject requests');
    }

    // 3. Actualizar solicitud
    const updatedRequest = await this.prisma.orderStatusChangeRequest.update({
      where: { id: requestId },
      data: {
        status: EditRequestStatus.REJECTED,
        reviewedById: adminId,
        reviewedAt: new Date(),
        reviewNotes: dto.reviewNotes,
      },
      include: {
        requestedBy: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        reviewedBy: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    // 4. Notificar al solicitante
    const rejectReason = dto.reviewNotes
      ? ` Motivo: ${dto.reviewNotes}`
      : '';
    await this.notificationsService.create({
      userId: request.requestedById,
      type: NotificationType.STATUS_CHANGE_REQUEST_REJECTED,
      title: 'Solicitud de cambio de estado rechazada',
      message: `Tu solicitud para cambiar la orden ${request.order.orderNumber} a ${request.requestedStatus} ha sido rechazada.${rejectReason}`,
      relatedId: request.orderId,
      relatedType: 'Order',
    });

    return updatedRequest;
  }

  /**
   * Validar si el cambio de estado requiere autorización
   */
  async requiresAuthorization(
    orderId: string,
    newStatus: OrderStatus,
    userId: string,
  ): Promise<{ required: boolean; reason?: string }> {
    // 1. Verificar si el usuario es admin
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { role: true },
    });

    if (user?.role?.name === 'admin') {
      return { required: false };
    }

    // 2. Si el cambio es a DELIVERED_ON_CREDIT → SÍ requiere autorización
    if (newStatus === OrderStatus.DELIVERED_ON_CREDIT) {
      return {
        required: true,
        reason: 'Entregar a crédito requiere aprobación administrativa',
      };
    }

    return { required: false };
  }

  /**
   * Verificar si usuario tiene solicitud aprobada
   */
  async hasApprovedRequest(
    orderId: string,
    userId: string,
    newStatus: OrderStatus,
  ): Promise<boolean> {
    const approvedRequest =
      await this.prisma.orderStatusChangeRequest.findFirst({
        where: {
          orderId,
          requestedById: userId,
          requestedStatus: newStatus,
          status: EditRequestStatus.APPROVED,
        },
      });

    return !!approvedRequest;
  }

  /**
   * Obtener todas las solicitudes pendientes
   */
  async findPendingRequests(orderId?: string) {
    return this.prisma.orderStatusChangeRequest.findMany({
      where: {
        ...(orderId ? { orderId } : {}),
        status: EditRequestStatus.PENDING,
      },
      include: {
        requestedBy: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        order: {
          select: {
            id: true,
            orderNumber: true,
            status: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Obtener solicitudes de un usuario
   */
  async findByUser(userId: string) {
    return this.prisma.orderStatusChangeRequest.findMany({
      where: { requestedById: userId },
      include: {
        order: {
          select: {
            id: true,
            orderNumber: true,
            status: true,
          },
        },
        reviewedBy: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Obtener solicitud por ID
   */
  async findOne(requestId: string) {
    const request = await this.prisma.orderStatusChangeRequest.findUnique({
      where: { id: requestId },
      include: {
        requestedBy: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        reviewedBy: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        order: {
          select: {
            id: true,
            orderNumber: true,
            status: true,
          },
        },
      },
    });

    if (!request) {
      throw new NotFoundException('Status change request not found');
    }

    return request;
  }

  /**
   * Consumir (marcar como usada) una solicitud aprobada después del cambio exitoso
   */
  async consumeApprovedRequest(
    orderId: string,
    userId: string,
    newStatus: OrderStatus,
  ) {
    // Encontrar la solicitud aprobada
    const approvedRequest =
      await this.prisma.orderStatusChangeRequest.findFirst({
        where: {
          orderId,
          requestedById: userId,
          requestedStatus: newStatus,
          status: EditRequestStatus.APPROVED,
        },
      });

    if (approvedRequest) {
      // No cambiar el estado, solo registrar que fue usada (opcional: podrías agregar un campo "used" si quieres)
      // Por ahora, las solicitudes aprobadas permanecen en estado APPROVED
      // Esto permite audit trail completo
    }
  }
}
