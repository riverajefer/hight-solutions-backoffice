import {
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'crypto';
import { PrismaService } from '../../database/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { WhatsappService } from './whatsapp.service';
import { EditRequestStatus, NotificationType } from '../../generated/prisma';

@Injectable()
export class WhatsappWebhookService {
  private readonly logger = new Logger(WhatsappWebhookService.name);
  private readonly appSecret: string;
  private readonly frontendUrl: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
    private readonly whatsappService: WhatsappService,
  ) {
    this.appSecret =
      this.configService.get<string>('whatsapp.appSecret') || '';
    this.frontendUrl =
      this.configService.get<string>('app.frontendUrl') ||
      'http://localhost:5173';

    if (!this.appSecret) {
      this.logger.warn(
        'WHATSAPP_APP_SECRET not configured. Webhook signature validation will be skipped.',
      );
    }
  }

  /**
   * Verifica la firma X-Hub-Signature-256 enviada por Meta en cada webhook.
   * Meta firma el body raw con HMAC-SHA256 usando el App Secret de la aplicación.
   */
  verifyMetaSignature(rawBody: Buffer, signature: string): void {
    if (!this.appSecret) {
      this.logger.warn('Skipping Meta signature validation (no appSecret)');
      return;
    }

    if (!signature || !signature.startsWith('sha256=')) {
      throw new UnauthorizedException('Missing or invalid X-Hub-Signature-256');
    }

    const expected = createHmac('sha256', this.appSecret)
      .update(rawBody)
      .digest('hex');

    const received = signature.slice('sha256='.length);

    // Comparación en tiempo constante para prevenir timing attacks
    const expectedBuf = Buffer.from(expected, 'hex');
    const receivedBuf = Buffer.from(received, 'hex');

    if (
      expectedBuf.length !== receivedBuf.length ||
      !timingSafeEqual(expectedBuf, receivedBuf)
    ) {
      throw new UnauthorizedException('Invalid webhook signature');
    }
  }

  /**
   * Procesa el payload del webhook de Meta.
   * Solo actúa sobre mensajes interactivos de tipo button_reply.
   * Responde siempre HTTP 200 para evitar reintentos de Meta.
   */
  async processWebhook(body: Record<string, any>): Promise<void> {
    try {
      const messages: any[] =
        body?.entry?.[0]?.changes?.[0]?.value?.messages;

      if (!messages || messages.length === 0) {
        // Puede ser un evento de status de mensaje (sent/delivered/read) — ignorar
        return;
      }

      const message = messages[0];

      if (
        message?.type !== 'interactive' ||
        message?.interactive?.type !== 'button_reply'
      ) {
        this.logger.debug(
          `Ignoring non-button webhook message type: ${message?.type}`,
        );
        return;
      }

      const fromPhone: string = message.from;
      const buttonId: string = message.interactive.button_reply.id;

      await this.handleButtonReply(fromPhone, buttonId);
    } catch (error) {
      // Logueamos el error pero NO relanzamos — Meta reintentaría si devolvemos != 200
      this.logger.error(`Error processing webhook: ${error.message}`, error.stack);
    }
  }

  /**
   * Procesa un botón presionado por un administrador.
   * Parsea el buttonId, valida HMAC, identifica la solicitud y ejecuta la acción.
   *
   * Formato de buttonId:
   *   "view:{requestId}"
   *   "approve:{requestId}:{hmac32}"
   *   "reject:{requestId}:{hmac32}"
   */
  private async handleButtonReply(
    fromPhone: string,
    buttonId: string,
  ): Promise<void> {
    const parts = buttonId.split(':');
    const action = parts[0];

    if (!['view', 'approve', 'reject'].includes(action)) {
      this.logger.warn(`Unknown button action: ${action}`);
      return;
    }

    const requestId = parts[1];
    if (!requestId) {
      this.logger.warn(`Button ID missing requestId: ${buttonId}`);
      return;
    }

    if (action === 'view') {
      await this.handleViewOrder(fromPhone, requestId);
      return;
    }

    // Para approve y reject: validar HMAC
    const receivedHmac = parts[2];
    if (!receivedHmac) {
      this.logger.warn(`Button ID missing HMAC for action ${action}`);
      return;
    }

    if (!this.whatsappService.validateActionHmac(action, requestId, fromPhone, receivedHmac)) {
      this.logger.warn(
        `Invalid HMAC for action="${action}" requestId="${requestId}" from="${fromPhone}"`,
      );
      await this.whatsappService.sendTextMessage(
        fromPhone,
        '⚠️ Token inválido o expirado. Por favor accede al sistema para gestionar la solicitud.',
      );
      return;
    }

    // Buscar la solicitud en DB
    const request = await this.prisma.orderEditRequest.findFirst({
      where: { id: requestId },
      include: {
        requestedBy: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
        order: { select: { id: true, orderNumber: true } },
      },
    });

    if (!request) {
      this.logger.warn(`Order edit request not found: ${requestId}`);
      await this.whatsappService.sendTextMessage(
        fromPhone,
        '⚠️ Solicitud no encontrada.',
      );
      return;
    }

    if (request.status !== EditRequestStatus.PENDING) {
      const statusLabel =
        request.status === EditRequestStatus.APPROVED ? 'aprobada' : 'rechazada';
      await this.whatsappService.sendTextMessage(
        fromPhone,
        `ℹ️ La solicitud de edición de la Orden *${request.order.orderNumber}* ya fue ${statusLabel} anteriormente.`,
      );
      return;
    }

    // Buscar el admin por número de teléfono
    const adminByPhone = await this.findAdminByPhone(fromPhone);

    if (!adminByPhone) {
      this.logger.warn(
        `No admin found with phone ${fromPhone}. Ignoring action.`,
      );
      await this.whatsappService.sendTextMessage(
        fromPhone,
        '⚠️ No tienes permisos para realizar esta acción.',
      );
      return;
    }

    if (action === 'approve') {
      await this.approveRequest(request, adminByPhone.id, fromPhone);
    } else if (action === 'reject') {
      await this.rejectRequest(request, adminByPhone.id, fromPhone);
    }
  }

  private async handleViewOrder(
    fromPhone: string,
    requestId: string,
  ): Promise<void> {
    const request = await this.prisma.orderEditRequest.findFirst({
      where: { id: requestId },
      include: { order: { select: { id: true, orderNumber: true } } },
    });

    if (!request) {
      await this.whatsappService.sendTextMessage(
        fromPhone,
        '⚠️ Solicitud no encontrada.',
      );
      return;
    }

    const url = `${this.frontendUrl}/orders/${request.order.id}`;
    await this.whatsappService.sendTextMessage(
      fromPhone,
      `🔗 *Orden de Pedido ${request.order.orderNumber}*\n${url}`,
    );
  }

  private async approveRequest(
    request: any,
    adminId: string,
    fromPhone: string,
  ): Promise<void> {
    await this.prisma.orderEditRequest.update({
      where: { id: request.id },
      data: {
        status: EditRequestStatus.APPROVED,
        reviewedById: adminId,
        reviewedAt: new Date(),
        reviewNotes: 'Aprobado vía WhatsApp',
        expiresAt: null,
      },
    });

    await this.notificationsService.create({
      userId: request.requestedById,
      type: NotificationType.EDIT_REQUEST_APPROVED,
      title: 'Solicitud de edición aprobada',
      message: `Tu solicitud para editar la orden ${request.order.orderNumber} ha sido aprobada. Tienes 5 minutos para realizar los cambios.`,
      relatedId: request.orderId,
      relatedType: 'Order',
    });

    await this.whatsappService.sendTextMessage(
      fromPhone,
      `✅ La Orden de Pedido *${request.order.orderNumber}* fue autorizada correctamente.`,
    );

    this.logger.log(
      `Order edit request ${request.id} APPROVED via WhatsApp by admin phone ${fromPhone}`,
    );
  }

  private async rejectRequest(
    request: any,
    adminId: string,
    fromPhone: string,
  ): Promise<void> {
    await this.prisma.orderEditRequest.update({
      where: { id: request.id },
      data: {
        status: EditRequestStatus.REJECTED,
        reviewedById: adminId,
        reviewedAt: new Date(),
        reviewNotes: 'Rechazado vía WhatsApp',
      },
    });

    await this.notificationsService.create({
      userId: request.requestedById,
      type: NotificationType.EDIT_REQUEST_REJECTED,
      title: 'Solicitud de edición rechazada',
      message: `Tu solicitud para editar la orden ${request.order.orderNumber} ha sido rechazada.`,
      relatedId: request.orderId,
      relatedType: 'Order',
    });

    await this.whatsappService.sendTextMessage(
      fromPhone,
      `❌ La Orden de Pedido *${request.order.orderNumber}* fue rechazada.`,
    );

    this.logger.log(
      `Order edit request ${request.id} REJECTED via WhatsApp by admin phone ${fromPhone}`,
    );
  }

  /**
   * Busca un admin activo por número de teléfono (normalizado).
   * Acepta formato con o sin código de país.
   */
  private async findAdminByPhone(fromPhone: string) {
    // fromPhone viene de Meta en formato E.164 sin "+": ej. "573001234567"
    // En DB puede estar guardado como "+573001234567", "573001234567" o "3001234567"
    const variants = [
      fromPhone,
      `+${fromPhone}`,
      fromPhone.startsWith('57') ? fromPhone.slice(2) : null,
    ].filter(Boolean) as string[];

    return this.prisma.user.findFirst({
      where: {
        isActive: true,
        phone: { in: variants },
        role: { name: 'admin' },
      },
      include: { role: true },
    });
  }
}
