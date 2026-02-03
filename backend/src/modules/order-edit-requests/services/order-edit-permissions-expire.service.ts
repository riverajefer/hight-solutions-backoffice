import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../../database/prisma.service';
import { NotificationsService } from '../../notifications/notifications.service';
import { EditRequestStatus, NotificationType } from '../../../generated/prisma';

@Injectable()
export class OrderEditPermissionsExpireService {
  private readonly logger = new Logger(OrderEditPermissionsExpireService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  /**
   * Expirar permisos de edición vencidos
   * Se ejecuta cada 1 minuto
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async expirePermissions() {
    this.logger.debug('Running expirePermissions cron job');

    const now = new Date();

    // Buscar solicitudes aprobadas que ya expiraron
    const expiredRequests = await this.prisma.orderEditRequest.findMany({
      where: {
        status: EditRequestStatus.APPROVED,
        expiresAt: {
          lte: now,
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
        order: {
          select: {
            id: true,
            orderNumber: true,
          },
        },
      },
    });

    if (expiredRequests.length === 0) {
      this.logger.debug('No expired permissions found');
      return;
    }

    this.logger.log(`Found ${expiredRequests.length} expired permissions`);

    // Actualizar estado de solicitudes expiradas
    const requestIds = expiredRequests.map((r) => r.id);
    await this.prisma.orderEditRequest.updateMany({
      where: { id: { in: requestIds } },
      data: { status: EditRequestStatus.EXPIRED },
    });

    // Notificar a cada usuario
    for (const request of expiredRequests) {
      try {
        await this.notificationsService.create({
          userId: request.requestedById,
          type: NotificationType.EDIT_PERMISSION_EXPIRED,
          title: 'Permiso de edición expirado',
          message: `Tu permiso para editar la orden ${request.order.orderNumber} ha expirado.`,
          relatedId: request.orderId,
          relatedType: 'Order',
        });
        this.logger.debug(
          `Notification sent to user ${request.requestedBy.email} for expired permission on order ${request.order.orderNumber}`,
        );
      } catch (error) {
        this.logger.error(
          `Failed to notify user ${request.requestedById} about expired permission: ${error.message}`,
        );
      }
    }

    this.logger.log(
      `Successfully expired ${expiredRequests.length} permissions`,
    );
  }

  /**
   * Notificar sobre permisos que están por expirar (1 minuto antes)
   * Se ejecuta cada 1 minuto
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async notifyExpiringPermissions() {
    this.logger.debug('Running notifyExpiringPermissions cron job');

    const now = new Date();
    const oneMinuteFromNow = new Date(now.getTime() + 60 * 1000); // +1 minuto

    // Buscar solicitudes aprobadas que expiran en el próximo minuto
    const expiringRequests = await this.prisma.orderEditRequest.findMany({
      where: {
        status: EditRequestStatus.APPROVED,
        expiresAt: {
          gte: now,
          lte: oneMinuteFromNow,
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
        order: {
          select: {
            id: true,
            orderNumber: true,
          },
        },
      },
    });

    if (expiringRequests.length === 0) {
      this.logger.debug('No expiring permissions found');
      return;
    }

    this.logger.log(
      `Found ${expiringRequests.length} permissions expiring soon`,
    );

    // Notificar a cada usuario
    for (const request of expiringRequests) {
      try {
        await this.notificationsService.create({
          userId: request.requestedById,
          type: NotificationType.EDIT_PERMISSION_EXPIRING,
          title: 'Permiso de edición por expirar',
          message: `Tu permiso para editar la orden ${request.order.orderNumber} expira en 1 minuto. Guarda tus cambios.`,
          relatedId: request.orderId,
          relatedType: 'Order',
        });
        this.logger.debug(
          `Notification sent to user ${request.requestedBy.email} for expiring permission on order ${request.order.orderNumber}`,
        );
      } catch (error) {
        this.logger.error(
          `Failed to notify user ${request.requestedById} about expiring permission: ${error.message}`,
        );
      }
    }

    this.logger.log(
      `Successfully notified ${expiringRequests.length} users about expiring permissions`,
    );
  }
}
