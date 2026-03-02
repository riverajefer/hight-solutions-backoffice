import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateEditRequestDto, ReviewEditRequestDto } from './dto';
import { EditRequestStatus, NotificationType } from '../../generated/prisma';

@Injectable()
export class OrderEditRequestsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  /**
   * Crear solicitud de edición
   */
  async create(orderId: string, userId: string, dto: CreateEditRequestDto) {
    // 1. Validar que orden existe
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new NotFoundException(`Order with id ${orderId} not found`);
    }

    // 2. Validar que orden está en estado editable
    const editableStatus = await this.prisma.editableOrderStatus.findUnique({
      where: { orderStatus: order.status },
    });

    if (!editableStatus || !editableStatus.allowEditRequests) {
      throw new BadRequestException(
        `Order status ${order.status} does not allow edit requests`,
      );
    }

    // 3. Validar que usuario NO es admin
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { role: true },
    });

    if (user?.role?.name === 'admin') {
      throw new BadRequestException(
        'Administrators can edit orders directly without requesting permission',
      );
    }

    // 4. Validar que no hay solicitud PENDING del mismo usuario
    const existingRequest = await this.prisma.orderEditRequest.findFirst({
      where: {
        orderId,
        requestedById: userId,
        status: EditRequestStatus.PENDING,
      },
    });

    if (existingRequest) {
      throw new BadRequestException(
        'You already have a pending edit request for this order',
      );
    }

    // 5. Crear solicitud
    const request = await this.prisma.orderEditRequest.create({
      data: {
        orderId,
        requestedById: userId,
        observations: dto.observations,
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
      type: NotificationType.EDIT_REQUEST_PENDING,
      title: 'Nueva solicitud de edición de orden',
      message: `${request.requestedBy.firstName || request.requestedBy.email} solicita permiso para editar la orden ${request.order.orderNumber}`,
      relatedId: request.id,
      relatedType: 'OrderEditRequest',
    });

    return request;
  }

  /**
   * Aprobar solicitud
   */
  async approve(
    orderId: string,
    requestId: string,
    adminId: string,
    dto: ReviewEditRequestDto,
  ) {
    // 1. Validar que solicitud existe y está PENDING
    const request = await this.prisma.orderEditRequest.findFirst({
      where: {
        id: requestId,
        orderId,
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
        'Edit request not found or already processed',
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

    // 3. Calcular expiresAt (ahora + 5 minutos)
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 5 * 60 * 1000); // 5 minutos

    // 4. Actualizar solicitud
    const updatedRequest = await this.prisma.orderEditRequest.update({
      where: { id: requestId },
      data: {
        status: EditRequestStatus.APPROVED,
        reviewedById: adminId,
        reviewedAt: now,
        reviewNotes: dto.reviewNotes,
        expiresAt,
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
      type: NotificationType.EDIT_REQUEST_APPROVED,
      title: 'Solicitud de edición aprobada',
      message: `Tu solicitud para editar la orden ${request.order.orderNumber} ha sido aprobada. Tienes 5 minutos para realizar los cambios.`,
      relatedId: request.orderId,
      relatedType: 'Order',
    });

    return updatedRequest;
  }

  /**
   * Rechazar solicitud
   */
  async reject(
    orderId: string,
    requestId: string,
    adminId: string,
    dto: ReviewEditRequestDto,
  ) {
    // 1. Validar que solicitud existe y está PENDING
    const request = await this.prisma.orderEditRequest.findFirst({
      where: {
        id: requestId,
        orderId,
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
        'Edit request not found or already processed',
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
    const updatedRequest = await this.prisma.orderEditRequest.update({
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
      type: NotificationType.EDIT_REQUEST_REJECTED,
      title: 'Solicitud de edición rechazada',
      message: `Tu solicitud para editar la orden ${request.order.orderNumber} ha sido rechazada.${rejectReason}`,
      relatedId: request.orderId,
      relatedType: 'Order',
    });

    return updatedRequest;
  }

  /**
   * Verificar si usuario tiene permiso activo
   */
  async hasActivePermission(orderId: string, userId: string): Promise<boolean> {
    const now = new Date();

    const activeRequest = await this.prisma.orderEditRequest.findFirst({
      where: {
        orderId,
        requestedById: userId,
        status: EditRequestStatus.APPROVED,
        expiresAt: {
          gt: now,
        },
      },
    });

    return !!activeRequest;
  }

  /**
   * Obtener permiso activo
   */
  async getActivePermission(orderId: string, userId: string) {
    const now = new Date();

    return this.prisma.orderEditRequest.findFirst({
      where: {
        orderId,
        requestedById: userId,
        status: EditRequestStatus.APPROVED,
        expiresAt: {
          gt: now,
        },
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
      },
    });
  }

  /**
   * Obtener todas las solicitudes pendientes (para admins)
   */
  async findAllPending() {
    return this.prisma.orderEditRequest.findMany({
      where: { status: EditRequestStatus.PENDING },
      include: {
        order: {
          select: {
            id: true,
            orderNumber: true,
            status: true,
          },
        },
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
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Obtener todas las solicitudes de una orden
   */
  async findByOrder(orderId: string) {
    return this.prisma.orderEditRequest.findMany({
      where: { orderId },
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
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Obtener solicitud por ID (sin requerir orderId)
   */
  async findOneById(requestId: string) {
    const request = await this.prisma.orderEditRequest.findUnique({
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
      },
    });

    if (!request) {
      throw new NotFoundException('Edit request not found');
    }

    return request;
  }

  /**
   * Obtener solicitud por ID
   */
  async findOne(orderId: string, requestId: string) {
    const request = await this.prisma.orderEditRequest.findFirst({
      where: {
        id: requestId,
        orderId,
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

    if (!request) {
      throw new NotFoundException('Edit request not found');
    }

    return request;
  }
}
