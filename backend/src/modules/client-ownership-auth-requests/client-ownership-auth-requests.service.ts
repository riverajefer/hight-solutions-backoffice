import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import {
  ApproveClientOwnershipAuthRequestDto,
  RejectClientOwnershipAuthRequestDto,
} from './dto';
import { EditRequestStatus, NotificationType } from '../../generated/prisma';

const USER_SELECT = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
} as const;

@Injectable()
export class ClientOwnershipAuthRequestsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  /**
   * Verifica si el creador de la orden necesita autorización para asociar el cliente.
   * No requiere auth si:
   *   - El cliente no tiene asesor asignado
   *   - El creador es el mismo asesor del cliente
   *   - El creador tiene el permiso `approve_client_ownership_auth` (admin)
   */
  async requiresAuth(
    creatorId: string,
    clientId: string,
  ): Promise<{ required: boolean; advisorId?: string; reason?: string }> {
    const client = await this.prisma.client.findUnique({
      where: { id: clientId },
      select: { advisorId: true },
    });

    if (!client?.advisorId) {
      return { required: false };
    }

    if (client.advisorId === creatorId) {
      return { required: false };
    }

    const creator = await this.prisma.user.findUnique({
      where: { id: creatorId },
      include: {
        role: {
          include: {
            permissions: { include: { permission: true } },
          },
        },
      },
    });

    const hasAdminBypass = creator?.role?.permissions?.some(
      (rp) => rp.permission.name === 'approve_client_ownership_auth',
    );

    if (hasAdminBypass) {
      return { required: false };
    }

    return {
      required: true,
      advisorId: client.advisorId,
      reason: 'Este cliente pertenece a otro asesor. Se requiere autorización de un administrador.',
    };
  }

  /**
   * Crea la solicitud de autorización al momento de crear la orden.
   * Actualiza el campo clientOwnershipAuthStatus de la orden a PENDING.
   * Notifica a los usuarios con permiso approve_client_ownership_auth.
   */
  async createFromOrderCreation(
    requestedById: string,
    orderId: string,
    advisorId: string,
  ) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: { id: true, orderNumber: true },
    });

    if (!order) {
      throw new NotFoundException(`Orden con id ${orderId} no encontrada`);
    }

    const requester = await this.prisma.user.findUnique({
      where: { id: requestedById },
      select: USER_SELECT,
    });

    const request = await this.prisma.clientOwnershipAuthRequest.create({
      data: {
        orderId,
        requestedById,
        advisorId,
        status: EditRequestStatus.PENDING,
      },
      include: {
        requestedBy: { select: USER_SELECT },
        advisor: { select: USER_SELECT },
        order: { select: { id: true, orderNumber: true } },
      },
    });

    await this.prisma.order.update({
      where: { id: orderId },
      data: { clientOwnershipAuthStatus: EditRequestStatus.PENDING },
    });

    await this.notificationsService.notifyUsersWithPermission(
      'approve_client_ownership_auth',
      {
        type: NotificationType.CLIENT_OWNERSHIP_AUTH_PENDING,
        title: 'Nueva solicitud de autorización de cliente',
        message: `${requester?.firstName || requester?.email} solicita crear la orden ${order.orderNumber} para un cliente asignado a otro asesor.`,
        relatedId: request.id,
        relatedType: 'ClientOwnershipAuthRequest',
      },
    );

    return request;
  }

  /**
   * Aprobar la solicitud. Desbloquea la orden.
   */
  async approve(
    requestId: string,
    reviewerId: string,
    dto: ApproveClientOwnershipAuthRequestDto,
  ) {
    const request = await this.prisma.clientOwnershipAuthRequest.findFirst({
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

    const updatedRequest = await this.prisma.clientOwnershipAuthRequest.update({
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

    await this.prisma.order.update({
      where: { id: request.orderId },
      data: { clientOwnershipAuthStatus: EditRequestStatus.APPROVED },
    });

    await this.notificationsService.create({
      userId: request.requestedById,
      type: NotificationType.CLIENT_OWNERSHIP_AUTH_APPROVED,
      title: 'Autorización aprobada',
      message: `La autorización para la orden ${request.order.orderNumber} fue aprobada. La orden puede proceder normalmente.`,
      relatedId: request.orderId,
      relatedType: 'Order',
    });

    return updatedRequest;
  }

  /**
   * Rechazar la solicitud. La orden queda marcada como REJECTED pero no se elimina.
   */
  async reject(
    requestId: string,
    reviewerId: string,
    dto: RejectClientOwnershipAuthRequestDto,
  ) {
    const request = await this.prisma.clientOwnershipAuthRequest.findFirst({
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

    await this.prisma.clientOwnershipAuthRequest.update({
      where: { id: requestId },
      data: {
        status: EditRequestStatus.REJECTED,
        reviewedById: reviewerId,
        reviewedAt: new Date(),
        reviewNotes: dto.reviewNotes,
      },
    });

    await this.prisma.order.update({
      where: { id: request.orderId },
      data: { clientOwnershipAuthStatus: EditRequestStatus.REJECTED },
    });

    const rejectReason = dto.reviewNotes ? ` Motivo: ${dto.reviewNotes}` : '';
    await this.notificationsService.create({
      userId: request.requestedById,
      type: NotificationType.CLIENT_OWNERSHIP_AUTH_REJECTED,
      title: 'Autorización rechazada',
      message: `La solicitud de autorización para la orden ${request.order.orderNumber} fue rechazada.${rejectReason} La orden quedará bloqueada.`,
      relatedId: request.orderId,
      relatedType: 'Order',
    });

    return this.prisma.clientOwnershipAuthRequest.findUnique({
      where: { id: requestId },
      include: {
        requestedBy: { select: USER_SELECT },
        reviewedBy: { select: USER_SELECT },
        order: { select: { id: true, orderNumber: true } },
      },
    });
  }

  /**
   * Solicitudes pendientes para el dashboard del admin.
   */
  async findPendingRequests() {
    return this.prisma.clientOwnershipAuthRequest.findMany({
      where: { status: EditRequestStatus.PENDING },
      include: {
        requestedBy: { select: USER_SELECT },
        advisor: { select: USER_SELECT },
        order: { select: { id: true, orderNumber: true, status: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Todas las solicitudes para auditoría.
   */
  async findAll() {
    return this.prisma.clientOwnershipAuthRequest.findMany({
      include: {
        requestedBy: { select: USER_SELECT },
        advisor: { select: USER_SELECT },
        reviewedBy: { select: USER_SELECT },
        order: { select: { id: true, orderNumber: true, status: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Solicitudes propias del usuario solicitante.
   */
  async findByUser(userId: string) {
    return this.prisma.clientOwnershipAuthRequest.findMany({
      where: { requestedById: userId },
      include: {
        advisor: { select: USER_SELECT },
        reviewedBy: { select: USER_SELECT },
        order: { select: { id: true, orderNumber: true, status: true } },
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
            permissions: { include: { permission: true } },
          },
        },
      },
    });

    const hasPermission = user?.role?.permissions?.some(
      (rp) => rp.permission.name === 'approve_client_ownership_auth',
    );

    if (!hasPermission) {
      throw new ForbiddenException(
        'Solo administradores pueden aprobar o rechazar solicitudes de autorización de propiedad de cliente.',
      );
    }
  }
}
