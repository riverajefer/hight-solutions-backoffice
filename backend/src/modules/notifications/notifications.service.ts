import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateNotificationDto, FilterNotificationsDto } from './dto';

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Crear una notificación
   */
  async create(dto: CreateNotificationDto) {
    return this.prisma.notification.create({
      data: dto,
    });
  }

  /**
   * Obtener notificaciones del usuario con paginación
   */
  async findByUser(userId: string, filters: FilterNotificationsDto) {
    const { page = 1, limit = 20, isRead } = filters;
    const skip = (page - 1) * limit;

    const where: any = {
      userId,
    };

    if (isRead !== undefined) {
      where.isRead = isRead;
    }

    const [data, total] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.notification.count({ where }),
    ]);

    return {
      data,
      total,
      page,
      limit,
    };
  }

  /**
   * Contar notificaciones no leídas
   */
  async countUnread(userId: string) {
    return this.prisma.notification.count({
      where: {
        userId,
        isRead: false,
      },
    });
  }

  /**
   * Marcar notificación como leída
   */
  async markAsRead(notificationId: string, userId: string) {
    return this.prisma.notification.updateMany({
      where: {
        id: notificationId,
        userId,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });
  }

  /**
   * Marcar todas las notificaciones como leídas
   */
  async markAllAsRead(userId: string) {
    return this.prisma.notification.updateMany({
      where: {
        userId,
        isRead: false,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });
  }

  /**
   * Eliminar notificación
   */
  async delete(notificationId: string, userId: string) {
    return this.prisma.notification.deleteMany({
      where: {
        id: notificationId,
        userId,
      },
    });
  }

  /**
   * Notificar a todos los administradores
   */
  async notifyAllAdmins(
    data: Omit<CreateNotificationDto, 'userId'>,
  ): Promise<void> {
    // Obtener rol de admin
    const adminRole = await this.prisma.role.findUnique({
      where: { name: 'admin' },
      include: {
        users: {
          select: { id: true },
        },
      },
    });

    if (!adminRole || adminRole.users.length === 0) {
      return;
    }

    // Crear notificaciones para todos los admins
    const notifications = adminRole.users.map((user) => ({
      userId: user.id,
      ...data,
    }));

    await this.prisma.notification.createMany({
      data: notifications,
    });
  }
}
