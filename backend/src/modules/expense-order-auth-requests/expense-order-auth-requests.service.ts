import {
  Injectable,
  Inject,
  Logger,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  OnModuleInit,
  forwardRef,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { WhatsappService } from '../whatsapp/whatsapp.service';
import {
  ApprovalRequestHandler,
  ApprovalRequestInfo,
  ApprovalRequestRegistry,
} from '../whatsapp/approval-request-registry';
import {
  ApproveExpenseOrderAuthRequestDto,
  CreateExpenseOrderAuthRequestDto,
  RejectExpenseOrderAuthRequestDto,
} from './dto';
import { ApprovalRequestType, EditRequestStatus, ExpenseOrderStatus, NotificationType } from '../../generated/prisma';
import { ExpenseOrdersService } from '../expense-orders/expense-orders.service';
import { AuthenticatedUser } from '../../common/interfaces/auth.interface';

const USER_SELECT = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
} as const;

@Injectable()
export class ExpenseOrderAuthRequestsService implements OnModuleInit, ApprovalRequestHandler {
  private readonly logger = new Logger(ExpenseOrderAuthRequestsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
    private readonly approvalRegistry: ApprovalRequestRegistry,
    private readonly whatsappService: WhatsappService,
    @Inject(forwardRef(() => ExpenseOrdersService))
    private readonly expenseOrdersService: ExpenseOrdersService,
  ) {}

  onModuleInit() {
    this.approvalRegistry.register('EXPENSE_ORDER_AUTH', this);
  }

  // ─── ApprovalRequestHandler interface ───

  async findPendingRequest(requestId: string): Promise<ApprovalRequestInfo | null> {
    const request = await this.prisma.expenseOrderAuthRequest.findUnique({
      where: { id: requestId },
      include: { expenseOrder: { select: { ogNumber: true } } },
    });
    if (!request) return null;
    return {
      id: request.id,
      status: request.status,
      requestedById: request.requestedById,
      displayLabel: `autorización de la OG ${request.expenseOrder.ogNumber}`,
    };
  }

  async approveViaWhatsApp(requestId: string, reviewerId: string): Promise<void> {
    const request = await this.prisma.expenseOrderAuthRequest.update({
      where: { id: requestId },
      data: {
        status: EditRequestStatus.APPROVED,
        reviewedById: reviewerId,
        reviewedAt: new Date(),
        reviewNotes: 'Aprobado vía WhatsApp',
      },
      include: { expenseOrder: { select: { ogNumber: true } } },
    });

    // Auto-transición: cambiar estado de la OG a ADMIN_AUTHORIZED (pendiente de firma de Caja)
    try {
      const admin = await this.prisma.user.findUnique({
        where: { id: reviewerId },
        include: { role: true },
      });
      if (admin) {
        const adminUser: AuthenticatedUser = {
          id: reviewerId,
          username: admin.username ?? admin.email ?? '',
          email: admin.email,
          roleId: admin.roleId,
          firstName: admin.firstName,
          lastName: admin.lastName,
        };
        await this.expenseOrdersService.updateStatus(
          request.expenseOrderId,
          { status: ExpenseOrderStatus.ADMIN_AUTHORIZED },
          adminUser,
        );
      }
    } catch (error: any) {
      this.logger.warn(
        `OG ${request.expenseOrder.ogNumber} aprobada vía WhatsApp pero no se pudo auto-transicionar: ${error.message}`,
      );
    }

    await this.notificationsService.create({
      userId: request.requestedById,
      type: NotificationType.EXPENSE_ORDER_AUTH_REQUEST_APPROVED,
      title: 'Solicitud de autorización de OG aprobada',
      message: `Tu solicitud para la OG ${request.expenseOrder.ogNumber} fue aprobada administrativamente. Pendiente de autorización de Caja para el pago.`,
      relatedId: request.expenseOrderId,
      relatedType: 'ExpenseOrder',
    });
  }

  async rejectViaWhatsApp(requestId: string, reviewerId: string): Promise<void> {
    const request = await this.prisma.expenseOrderAuthRequest.update({
      where: { id: requestId },
      data: {
        status: EditRequestStatus.REJECTED,
        reviewedById: reviewerId,
        reviewedAt: new Date(),
        reviewNotes: 'Rechazado vía WhatsApp',
      },
      include: { expenseOrder: { select: { ogNumber: true } } },
    });

    await this.notificationsService.create({
      userId: request.requestedById,
      type: NotificationType.EXPENSE_ORDER_AUTH_REQUEST_REJECTED,
      title: 'Solicitud de autorización de OG rechazada',
      message: `Tu solicitud para autorizar la OG ${request.expenseOrder.ogNumber} ha sido rechazada.`,
      relatedId: request.expenseOrderId,
      relatedType: 'ExpenseOrder',
    });
  }

  // ─── Domain methods ───

  /**
   * Crear solicitud de autorización de OG
   */
  async create(userId: string, dto: CreateExpenseOrderAuthRequestDto) {
    // 1. Validar que OG existe
    const expenseOrder = await this.prisma.expenseOrder.findUnique({
      where: { id: dto.expenseOrderId },
    });

    if (!expenseOrder) {
      throw new NotFoundException(`OG con id ${dto.expenseOrderId} no encontrada`);
    }

    // 2. Validar que usuario NO es admin (admins pueden cambiar directamente)
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { role: true },
    });

    if (user?.role?.name === 'admin') {
      throw new BadRequestException(
        'Los administradores pueden autorizar la OG directamente sin crear una solicitud',
      );
    }

    // 3. Validar que no hay solicitud PENDING del mismo usuario para la misma OG
    const existingRequest = await this.prisma.expenseOrderAuthRequest.findFirst({
      where: {
        expenseOrderId: dto.expenseOrderId,
        requestedById: userId,
        status: EditRequestStatus.PENDING,
      },
    });

    if (existingRequest) {
      throw new BadRequestException(
        'Ya tienes una solicitud de autorización pendiente para esta OG',
      );
    }

    // 4. Crear solicitud
    const request = await this.prisma.expenseOrderAuthRequest.create({
      data: {
        expenseOrderId: dto.expenseOrderId,
        requestedById: userId,
        reason: dto.reason,
        status: EditRequestStatus.PENDING,
      },
      include: {
        requestedBy: { select: USER_SELECT },
        expenseOrder: { select: { id: true, ogNumber: true } },
      },
    });

    // 5. Notificar a todos los administradores (in-app)
    await this.notificationsService.notifyAllAdmins({
      type: NotificationType.EXPENSE_ORDER_AUTH_REQUEST_PENDING,
      title: 'Nueva solicitud de autorización de OG',
      message: `${request.requestedBy.firstName || request.requestedBy.email} solicita autorizar la OG ${request.expenseOrder.ogNumber}`,
      relatedId: request.id,
      relatedType: 'ExpenseOrderAuthRequest',
    });

    // 6. Notificar administradores por WhatsApp (fire & forget)
    const requesterName =
      [user?.firstName, user?.lastName].filter(Boolean).join(' ') ||
      request.requestedBy.email ||
      'Usuario';
    const requesterRole = user?.role?.name || 'usuario';

    this.notifyAdminsByWhatsApp(
      request.id,
      requesterName,
      requesterRole,
      `autorizar la OG ${request.expenseOrder.ogNumber}`,
      dto.reason || 'Sin motivo especificado',
    );

    return request;
  }

  /**
   * Aprobar solicitud
   */
  async approve(
    requestId: string,
    adminId: string,
    dto: ApproveExpenseOrderAuthRequestDto,
  ) {
    // 1. Validar que solicitud existe y está PENDING
    const request = await this.prisma.expenseOrderAuthRequest.findFirst({
      where: { id: requestId, status: EditRequestStatus.PENDING },
      include: {
        requestedBy: { select: USER_SELECT },
        expenseOrder: { select: { ogNumber: true, status: true } },
      },
    });

    if (!request) {
      throw new NotFoundException('Solicitud no encontrada o ya procesada');
    }

    // 2. Validar que revisor es admin
    const admin = await this.prisma.user.findUnique({
      where: { id: adminId },
      include: { role: true },
    });

    if (!admin || admin.role?.name !== 'admin') {
      throw new ForbiddenException('Solo los administradores pueden aprobar solicitudes');
    }

    // 3. Actualizar solicitud a APPROVED
    const updatedRequest = await this.prisma.expenseOrderAuthRequest.update({
      where: { id: requestId },
      data: {
        status: EditRequestStatus.APPROVED,
        reviewedById: adminId,
        reviewedAt: new Date(),
        reviewNotes: dto.reviewNotes,
      },
      include: {
        requestedBy: { select: USER_SELECT },
        reviewedBy: { select: USER_SELECT },
      },
    });

    // 4. Auto-transición: cambiar estado de la OG a ADMIN_AUTHORIZED (pendiente de firma de Caja)
    try {
      const adminUser: AuthenticatedUser = {
        id: adminId,
        username: admin.username ?? admin.email ?? '',
        email: admin.email,
        roleId: admin.roleId ?? admin.role?.id ?? '',
        firstName: admin.firstName,
        lastName: admin.lastName,
      };

      await this.expenseOrdersService.updateStatus(
        request.expenseOrderId,
        { status: ExpenseOrderStatus.ADMIN_AUTHORIZED },
        adminUser,
      );
    } catch (error: any) {
      this.logger.warn(
        `OG ${request.expenseOrder.ogNumber} aprobada pero no se pudo auto-transicionar: ${error.message}`,
      );
    }

    // 5. Notificar al solicitante
    await this.notificationsService.create({
      userId: request.requestedById,
      type: NotificationType.EXPENSE_ORDER_AUTH_REQUEST_APPROVED,
      title: 'Solicitud de autorización de OG aprobada',
      message: `Tu solicitud para la OG ${request.expenseOrder.ogNumber} fue aprobada administrativamente. Pendiente de autorización de Caja para el pago.`,
      relatedId: request.expenseOrderId,
      relatedType: 'ExpenseOrder',
    });

    return updatedRequest;
  }

  /**
   * Rechazar solicitud
   */
  async reject(
    requestId: string,
    adminId: string,
    dto: RejectExpenseOrderAuthRequestDto,
  ) {
    // 1. Validar que solicitud existe y está PENDING
    const request = await this.prisma.expenseOrderAuthRequest.findFirst({
      where: { id: requestId, status: EditRequestStatus.PENDING },
      include: {
        requestedBy: { select: USER_SELECT },
        expenseOrder: { select: { ogNumber: true } },
      },
    });

    if (!request) {
      throw new NotFoundException('Solicitud no encontrada o ya procesada');
    }

    // 2. Validar que revisor es admin
    const admin = await this.prisma.user.findUnique({
      where: { id: adminId },
      include: { role: true },
    });

    if (admin?.role?.name !== 'admin') {
      throw new ForbiddenException('Solo los administradores pueden rechazar solicitudes');
    }

    // 3. Actualizar solicitud a REJECTED
    const updatedRequest = await this.prisma.expenseOrderAuthRequest.update({
      where: { id: requestId },
      data: {
        status: EditRequestStatus.REJECTED,
        reviewedById: adminId,
        reviewedAt: new Date(),
        reviewNotes: dto.reviewNotes,
      },
      include: {
        requestedBy: { select: USER_SELECT },
        reviewedBy: { select: USER_SELECT },
      },
    });

    // 4. Notificar al solicitante
    const rejectReason = dto.reviewNotes ? ` Motivo: ${dto.reviewNotes}` : '';
    await this.notificationsService.create({
      userId: request.requestedById,
      type: NotificationType.EXPENSE_ORDER_AUTH_REQUEST_REJECTED,
      title: 'Solicitud de autorización de OG rechazada',
      message: `Tu solicitud para autorizar la OG ${request.expenseOrder.ogNumber} ha sido rechazada.${rejectReason}`,
      relatedId: request.expenseOrderId,
      relatedType: 'ExpenseOrder',
    });

    return updatedRequest;
  }

  /**
   * Verificar si el cambio a AUTHORIZED requiere autorización (usuario no-admin)
   */
  async requiresAuthorization(userId: string): Promise<{ required: boolean; reason?: string }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { role: true },
    });

    if (user?.role?.name === 'admin') {
      return { required: false };
    }

    return {
      required: true,
      reason: 'Autorizar una OG requiere aprobación de un administrador',
    };
  }

  /**
   * Verificar si usuario tiene solicitud aprobada para una OG
   */
  async hasApprovedRequest(expenseOrderId: string, userId: string): Promise<boolean> {
    const approvedRequest = await this.prisma.expenseOrderAuthRequest.findFirst({
      where: {
        expenseOrderId,
        requestedById: userId,
        status: EditRequestStatus.APPROVED,
      },
    });

    return !!approvedRequest;
  }

  /**
   * Obtener la solicitud aprobada para recuperar quién la aprobó
   */
  async getApprovedRequest(expenseOrderId: string, userId: string) {
    return this.prisma.expenseOrderAuthRequest.findFirst({
      where: {
        expenseOrderId,
        requestedById: userId,
        status: EditRequestStatus.APPROVED,
      },
    });
  }

  /**
   * Consumir solicitud aprobada (no-op — se mantiene para audit trail)
   */
  async consumeApprovedRequest(expenseOrderId: string, userId: string): Promise<void> {
    // Las solicitudes aprobadas permanecen en estado APPROVED para audit trail completo
    void expenseOrderId;
    void userId;
  }

  /**
   * Obtener solicitudes pendientes (para admins)
   */
  async findPendingRequests() {
    return this.prisma.expenseOrderAuthRequest.findMany({
      where: { status: EditRequestStatus.PENDING },
      include: {
        requestedBy: { select: USER_SELECT },
        expenseOrder: { select: { id: true, ogNumber: true, status: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Obtener todas las solicitudes (para admins)
   */
  async findAll() {
    return this.prisma.expenseOrderAuthRequest.findMany({
      include: {
        requestedBy: { select: USER_SELECT },
        reviewedBy: { select: USER_SELECT },
        expenseOrder: { select: { id: true, ogNumber: true, status: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Obtener solicitudes propias del usuario
   */
  async findByUser(userId: string) {
    return this.prisma.expenseOrderAuthRequest.findMany({
      where: { requestedById: userId },
      include: {
        reviewedBy: { select: USER_SELECT },
        expenseOrder: { select: { id: true, ogNumber: true, status: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  private async notifyAdminsByWhatsApp(
    requestId: string,
    requesterName: string,
    requesterRole: string,
    actionDescription: string,
    reason: string,
  ): Promise<void> {
    try {
      const adminRole = await this.prisma.role.findUnique({
        where: { name: 'admin' },
        include: {
          users: {
            where: { isActive: true, phone: { not: null } },
            select: { phone: true },
          },
        },
      });

      const adminsWithPhone = adminRole?.users || [];

      if (adminsWithPhone.length === 0) {
        this.logger.warn(
          'No active administrators with phone number found for WhatsApp notification',
        );
        return;
      }

      const results = await Promise.allSettled(
        adminsWithPhone.map((admin) =>
          this.whatsappService.sendApprovalNotification({
            telefono: admin.phone!,
            requesterName,
            requesterRole,
            actionDescription,
            reason,
            requestId,
            requestType: ApprovalRequestType.EXPENSE_ORDER_AUTH,
          }),
        ),
      );

      const fulfilled = results.filter((r) => r.status === 'fulfilled').length;
      const rejected = results.filter((r) => r.status === 'rejected').length;

      this.logger.log(
        `WhatsApp notifications for expense order auth request ${requestId}: ${fulfilled} sent, ${rejected} failed`,
      );
    } catch (error) {
      this.logger.error(
        `Error sending WhatsApp notifications: ${error.message}`,
      );
    }
  }
}
