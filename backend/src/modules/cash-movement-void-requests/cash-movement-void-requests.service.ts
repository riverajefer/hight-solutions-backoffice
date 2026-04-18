import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  OnModuleInit,
  Inject,
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
import { CashMovementService } from '../cash-movement/cash-movement.service';
import { CreateVoidRequestDto, ReviewVoidRequestDto } from './dto';
import {
  EditRequestStatus,
  NotificationType,
  ApprovalRequestType,
} from '../../generated/prisma';

@Injectable()
export class CashMovementVoidRequestsService
  implements OnModuleInit, ApprovalRequestHandler
{
  private readonly logger = new Logger(CashMovementVoidRequestsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
    private readonly whatsappService: WhatsappService,
    private readonly approvalRegistry: ApprovalRequestRegistry,
    @Inject(forwardRef(() => CashMovementService))
    private readonly cashMovementService: CashMovementService,
  ) {}

  onModuleInit() {
    this.approvalRegistry.register('CASH_MOVEMENT_VOID', this);
  }

  // ─── ApprovalRequestHandler interface ───

  async findPendingRequest(
    requestId: string,
  ): Promise<ApprovalRequestInfo | null> {
    const request = await this.prisma.cashMovementVoidRequest.findUnique({
      where: { id: requestId },
      include: {
        cashMovement: { select: { receiptNumber: true } },
      },
    });
    if (!request) return null;
    return {
      id: request.id,
      status: request.status,
      requestedById: request.requestedById,
      displayLabel: `Anulación del movimiento ${request.cashMovement.receiptNumber}`,
    };
  }

  async approveViaWhatsApp(
    requestId: string,
    reviewerId: string,
  ): Promise<void> {
    const request = await this.prisma.cashMovementVoidRequest.findUnique({
      where: { id: requestId },
      include: {
        cashMovement: { select: { id: true, receiptNumber: true } },
      },
    });

    if (!request || request.status !== EditRequestStatus.PENDING) return;

    // Update request status
    await this.prisma.cashMovementVoidRequest.update({
      where: { id: requestId },
      data: {
        status: EditRequestStatus.APPROVED,
        reviewedById: reviewerId,
        reviewedAt: new Date(),
        reviewNotes: 'Aprobado vía WhatsApp',
      },
    });

    // Execute the actual void
    await this.cashMovementService.voidMovement(
      request.cashMovementId,
      { voidReason: request.voidReason },
      reviewerId,
    );

    // Notify requester
    await this.notificationsService.create({
      userId: request.requestedById,
      type: NotificationType.CASH_VOID_REQUEST_APPROVED,
      title: 'Solicitud de anulación aprobada',
      message: `Tu solicitud para anular el movimiento ${request.cashMovement.receiptNumber} ha sido aprobada y ejecutada.`,
      relatedId: request.cashMovementId,
      relatedType: 'CashMovement',
    });
  }

  async rejectViaWhatsApp(
    requestId: string,
    reviewerId: string,
  ): Promise<void> {
    const request = await this.prisma.cashMovementVoidRequest.findUnique({
      where: { id: requestId },
      include: {
        cashMovement: { select: { receiptNumber: true } },
      },
    });

    if (!request || request.status !== EditRequestStatus.PENDING) return;

    await this.prisma.cashMovementVoidRequest.update({
      where: { id: requestId },
      data: {
        status: EditRequestStatus.REJECTED,
        reviewedById: reviewerId,
        reviewedAt: new Date(),
        reviewNotes: 'Rechazado vía WhatsApp',
      },
    });

    await this.notificationsService.create({
      userId: request.requestedById,
      type: NotificationType.CASH_VOID_REQUEST_REJECTED,
      title: 'Solicitud de anulación rechazada',
      message: `Tu solicitud para anular el movimiento ${request.cashMovement.receiptNumber} ha sido rechazada.`,
      relatedId: request.cashMovementId,
      relatedType: 'CashMovement',
    });
  }

  // ─── Domain methods ───

  async create(
    cashMovementId: string,
    userId: string,
    dto: CreateVoidRequestDto,
  ) {
    // 1. Validate movement exists and is not already voided
    const movement = await this.prisma.cashMovement.findUnique({
      where: { id: cashMovementId },
      include: {
        cashSession: { select: { status: true } },
      },
    });

    if (!movement) {
      throw new NotFoundException(
        `Movimiento de caja ${cashMovementId} no encontrado`,
      );
    }

    if (movement.isVoided) {
      throw new BadRequestException('El movimiento ya está anulado');
    }

    if (movement.cashSession.status !== 'OPEN') {
      throw new BadRequestException(
        'Solo se pueden anular movimientos de sesiones abiertas',
      );
    }

    // 2. Check no pending request already exists
    const existing = await this.prisma.cashMovementVoidRequest.findFirst({
      where: {
        cashMovementId,
        status: EditRequestStatus.PENDING,
      },
    });

    if (existing) {
      throw new BadRequestException(
        'Ya existe una solicitud de anulación pendiente para este movimiento',
      );
    }

    // 3. Create the request
    const request = await this.prisma.cashMovementVoidRequest.create({
      data: {
        cashMovementId,
        requestedById: userId,
        voidReason: dto.voidReason,
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
        cashMovement: {
          select: {
            id: true,
            receiptNumber: true,
            amount: true,
            movementType: true,
            description: true,
          },
        },
      },
    });

    // 4. Notify admins in-app
    await this.notificationsService.notifyAllAdmins({
      type: NotificationType.CASH_VOID_REQUEST_PENDING,
      title: 'Nueva solicitud de anulación de movimiento',
      message: `${request.requestedBy.firstName || request.requestedBy.email} solicita anular el movimiento ${request.cashMovement.receiptNumber} ($${parseFloat(request.cashMovement.amount.toString()).toLocaleString('es-CO')})`,
      relatedId: request.id,
      relatedType: 'CashMovementVoidRequest',
    });

    // 5. Notify admins via WhatsApp (fire-and-forget)
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { role: true },
    });

    const requesterName =
      [user?.firstName, user?.lastName].filter(Boolean).join(' ') ||
      request.requestedBy.email ||
      'Usuario';
    const requesterRole = user?.role?.name || 'usuario';

    this.notifyAdminsByWhatsApp(
      request.id,
      requesterName,
      requesterRole,
      `Anular movimiento ${request.cashMovement.receiptNumber} ($${parseFloat(request.cashMovement.amount.toString()).toLocaleString('es-CO')})`,
      dto.voidReason,
    );

    return request;
  }

  async approve(
    requestId: string,
    adminId: string,
    dto: ReviewVoidRequestDto,
  ) {
    // 1. Validate request exists and is PENDING
    const request = await this.prisma.cashMovementVoidRequest.findFirst({
      where: {
        id: requestId,
        status: EditRequestStatus.PENDING,
      },
      include: {
        requestedBy: true,
        cashMovement: { select: { id: true, receiptNumber: true } },
      },
    });

    if (!request) {
      throw new NotFoundException(
        'Solicitud de anulación no encontrada o ya fue procesada',
      );
    }

    // 2. Validate reviewer is admin
    const admin = await this.prisma.user.findUnique({
      where: { id: adminId },
      include: { role: true },
    });

    if (admin?.role?.name !== 'admin') {
      throw new ForbiddenException(
        'Solo los administradores pueden aprobar solicitudes',
      );
    }

    // 3. Update request
    const updatedRequest = await this.prisma.cashMovementVoidRequest.update({
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
        cashMovement: { select: { id: true, receiptNumber: true } },
      },
    });

    // 4. Execute the actual void
    await this.cashMovementService.voidMovement(
      request.cashMovementId,
      { voidReason: request.voidReason },
      adminId,
    );

    // 5. Notify requester
    await this.notificationsService.create({
      userId: request.requestedById,
      type: NotificationType.CASH_VOID_REQUEST_APPROVED,
      title: 'Solicitud de anulación aprobada',
      message: `Tu solicitud para anular el movimiento ${request.cashMovement.receiptNumber} ha sido aprobada y ejecutada.`,
      relatedId: request.cashMovementId,
      relatedType: 'CashMovement',
    });

    return updatedRequest;
  }

  async reject(
    requestId: string,
    adminId: string,
    dto: ReviewVoidRequestDto,
  ) {
    // 1. Validate request exists and is PENDING
    const request = await this.prisma.cashMovementVoidRequest.findFirst({
      where: {
        id: requestId,
        status: EditRequestStatus.PENDING,
      },
      include: {
        requestedBy: true,
        cashMovement: { select: { receiptNumber: true } },
      },
    });

    if (!request) {
      throw new NotFoundException(
        'Solicitud de anulación no encontrada o ya fue procesada',
      );
    }

    // 2. Validate reviewer is admin
    const admin = await this.prisma.user.findUnique({
      where: { id: adminId },
      include: { role: true },
    });

    if (admin?.role?.name !== 'admin') {
      throw new ForbiddenException(
        'Solo los administradores pueden rechazar solicitudes',
      );
    }

    // 3. Update request
    const updatedRequest = await this.prisma.cashMovementVoidRequest.update({
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

    // 4. Notify requester
    const rejectReason = dto.reviewNotes
      ? ` Motivo: ${dto.reviewNotes}`
      : '';
    await this.notificationsService.create({
      userId: request.requestedById,
      type: NotificationType.CASH_VOID_REQUEST_REJECTED,
      title: 'Solicitud de anulación rechazada',
      message: `Tu solicitud para anular el movimiento ${request.cashMovement.receiptNumber} ha sido rechazada.${rejectReason}`,
      relatedId: request.cashMovementId,
      relatedType: 'CashMovement',
    });

    return updatedRequest;
  }

  private readonly defaultInclude = {
    cashMovement: {
      select: {
        id: true,
        receiptNumber: true,
        amount: true,
        movementType: true,
        description: true,
        paymentMethod: true,
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
  };

  async findAllPending() {
    return this.prisma.cashMovementVoidRequest.findMany({
      where: { status: EditRequestStatus.PENDING },
      include: this.defaultInclude,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findAll() {
    return this.prisma.cashMovementVoidRequest.findMany({
      include: this.defaultInclude,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findByMovement(cashMovementId: string) {
    return this.prisma.cashMovementVoidRequest.findMany({
      where: { cashMovementId },
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
            requestType: ApprovalRequestType.CASH_MOVEMENT_VOID,
          }),
        ),
      );

      const fulfilled = results.filter((r) => r.status === 'fulfilled').length;
      const rejected = results.filter((r) => r.status === 'rejected').length;

      this.logger.log(
        `WhatsApp notifications for void request ${requestId}: ${fulfilled} sent, ${rejected} failed`,
      );
    } catch (error) {
      this.logger.error(
        `Error sending WhatsApp notifications: ${error.message}`,
      );
    }
  }
}
