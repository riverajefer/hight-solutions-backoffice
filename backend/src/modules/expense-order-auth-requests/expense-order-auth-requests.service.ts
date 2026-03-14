import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import {
  ApproveExpenseOrderAuthRequestDto,
  CreateExpenseOrderAuthRequestDto,
  RejectExpenseOrderAuthRequestDto,
} from './dto';
import { EditRequestStatus, NotificationType } from '../../generated/prisma';

const USER_SELECT = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
} as const;

@Injectable()
export class ExpenseOrderAuthRequestsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

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

    // 5. Notificar a todos los administradores
    await this.notificationsService.notifyAllAdmins({
      type: NotificationType.EXPENSE_ORDER_AUTH_REQUEST_PENDING,
      title: 'Nueva solicitud de autorización de OG',
      message: `${request.requestedBy.firstName || request.requestedBy.email} solicita autorizar la OG ${request.expenseOrder.ogNumber}`,
      relatedId: request.id,
      relatedType: 'ExpenseOrderAuthRequest',
    });

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

    if (admin?.role?.name !== 'admin') {
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

    // 4. Notificar al solicitante
    await this.notificationsService.create({
      userId: request.requestedById,
      type: NotificationType.EXPENSE_ORDER_AUTH_REQUEST_APPROVED,
      title: 'Solicitud de autorización de OG aprobada',
      message: `Tu solicitud para autorizar la OG ${request.expenseOrder.ogNumber} ha sido aprobada. Ya puedes cambiar el estado.`,
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
}
