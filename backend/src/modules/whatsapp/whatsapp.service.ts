import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac } from 'crypto';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class WhatsappService {
  private readonly logger = new Logger(WhatsappService.name);
  private readonly baseUrl: string;
  private readonly accessToken: string;
  private readonly phoneNumberId: string;
  private readonly frontendUrl: string;
  private readonly isConfigured: boolean;
  private readonly actionSecret: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    this.accessToken =
      this.configService.get<string>('whatsapp.accessToken') || '';
    this.phoneNumberId =
      this.configService.get<string>('whatsapp.phoneNumberId') || '';
    const apiVersion =
      this.configService.get<string>('whatsapp.apiVersion') || 'v22.0';

    this.baseUrl = `https://graph.facebook.com/${apiVersion}/${this.phoneNumberId}/messages`;
    this.frontendUrl =
      this.configService.get<string>('app.frontendUrl') ||
      'http://localhost:5173';
    this.actionSecret =
      this.configService.get<string>('whatsapp.actionSecret') || '';
    this.isConfigured = !!(this.accessToken && this.phoneNumberId);

    if (!this.isConfigured) {
      this.logger.warn(
        'WhatsApp Cloud API credentials not configured. Messages will not be sent.',
      );
    }
  }

  /**
   * Normaliza un número de teléfono al formato E.164 sin "+"
   * Ejemplos: "+573118322699" → "573118322699"
   *           "3118322699"    → "573118322699" (asume Colombia si son 10 dígitos y empieza en 3)
   *           "573118322699"  → "573118322699"
   */
  private normalizePhone(phone: string): string {
    // Eliminar todo lo que no sea dígito ni "+"
    let cleaned = phone.replace(/[^\d+]/g, '');
    // Quitar el "+" inicial si existe
    if (cleaned.startsWith('+')) cleaned = cleaned.slice(1);
    // Si es un número colombiano de 10 dígitos (empieza en 3), agregar indicativo 57
    if (cleaned.length === 10 && cleaned.startsWith('3')) {
      cleaned = `57${cleaned}`;
    }
    return cleaned;
  }

  /**
   * Enviar mensaje con template de WhatsApp Cloud API
   * @param to Número de teléfono (acepta +57..., 57..., o 10 dígitos colombianos)
   * @param templateName Nombre del template aprobado
   * @param params Parámetros del body del template (en orden)
   * @param language Código de idioma del template (default: es_CO)
   * @param buttonParams Parámetros para botones CTA de URL dinámica (opcional)
   * @returns messageId en caso de éxito, null si falla
   */
  async sendTemplateMessage(
    to: string,
    templateName: string,
    params: string[],
    language: string = 'es_CO',
    buttonParams?: { index: number; text: string }[],
  ): Promise<string | null> {
    if (!this.isConfigured) {
      this.logger.warn(
        `WhatsApp not configured. Skipping template "${templateName}" to ${to}`,
      );
      return null;
    }

    const normalizedTo = this.normalizePhone(to);
    this.logger.debug(
      `Sending WhatsApp template "${templateName}" to ${normalizedTo} (original: ${to})`,
    );

    const components: Record<string, unknown>[] = [
      {
        type: 'body',
        parameters: params.map((value) => ({
          type: 'text',
          text: value,
        })),
      },
    ];

    // Agregar botones CTA de URL dinámica si existen
    if (buttonParams && buttonParams.length > 0) {
      for (const btn of buttonParams) {
        components.push({
          type: 'button',
          sub_type: 'url',
          index: btn.index.toString(),
          parameters: [{ type: 'text', text: btn.text }],
        });
      }
    }

    const body = {
      messaging_product: 'whatsapp',
      to: normalizedTo,
      type: 'template',
      template: {
        name: templateName,
        language: { code: language },
        components,
      },
    };

    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!response.ok) {
        const metaError = data?.error?.message || response.statusText;
        this.logger.error(
          `Failed to send WhatsApp template "${templateName}" to ${normalizedTo}: ${metaError}`,
        );
        return null;
      }

      const messageId = data?.messages?.[0]?.id;
      this.logger.log(
        `WhatsApp template "${templateName}" sent to ${normalizedTo}. MessageId: ${messageId}`,
      );
      return messageId || null;
    } catch (error) {
      this.logger.error(
        `Failed to send WhatsApp template "${templateName}" to ${normalizedTo}: ${error.message}`,
      );
      return null;
    }
  }

  /**
   * Enviar notificación de solicitud de edición de orden de pedido
   * Template: solicitud_edicion_op (es_CO)
   * Body: {{1}} nombre solicitante, {{2}} rol, {{3}} número de orden, {{4}} motivo
   * Botón CTA: "Ver solicitud" → URL con orderId dinámico
   */
  async notificarSolicitudEdicionOP(
    telefono: string,
    nombreSolicitante: string,
    rolSolicitante: string,
    numeroOrden: string,
    motivo: string,
    orderId: string,
  ): Promise<string | null> {
    return this.sendTemplateMessage(
      telefono,
      'solicitud_edicion_op',
      [nombreSolicitante, rolSolicitante, numeroOrden, motivo],
      'es_CO',
      [{ index: 0, text: orderId }],
    );
  }

  /**
   * Genera un HMAC-SHA256 para firmar una acción de botón.
   * El token vincula action + requestId + adminPhone para evitar replay y spoofing.
   * Retorna los primeros 32 caracteres en base64url.
   */
  generateActionHmac(
    action: string,
    requestId: string,
    adminPhone: string,
  ): string {
    return createHmac('sha256', this.actionSecret)
      .update(`${action}:${requestId}:${adminPhone}`)
      .digest('base64url')
      .slice(0, 32);
  }

  /**
   * Valida un HMAC de acción de botón.
   */
  validateActionHmac(
    action: string,
    requestId: string,
    adminPhone: string,
    receivedHmac: string,
  ): boolean {
    const expected = this.generateActionHmac(action, requestId, adminPhone);
    return expected === receivedHmac;
  }

  /**
   * Envía un mensaje interactivo con hasta 3 botones de respuesta rápida.
   * A diferencia de los templates, los IDs de botón son dinámicos — pueden
   * incluir HMAC y contexto de la solicitud.
   */
  async sendInteractiveButtonMessage(
    to: string,
    bodyText: string,
    buttons: Array<{ id: string; title: string }>,
  ): Promise<string | null> {
    if (!this.isConfigured) {
      this.logger.warn(
        `WhatsApp not configured. Skipping interactive message to ${to}`,
      );
      return null;
    }

    const normalizedTo = this.normalizePhone(to);

    const body = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: normalizedTo,
      type: 'interactive',
      interactive: {
        type: 'button',
        body: { text: bodyText },
        action: {
          buttons: buttons.map((btn) => ({
            type: 'reply',
            reply: { id: btn.id, title: btn.title },
          })),
        },
      },
    };

    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!response.ok) {
        const metaError = data?.error?.message || response.statusText;
        this.logger.error(
          `Failed to send interactive message to ${normalizedTo}: ${metaError}`,
        );
        return null;
      }

      const messageId = data?.messages?.[0]?.id;
      this.logger.log(
        `Interactive button message sent to ${normalizedTo}. MessageId: ${messageId}`,
      );
      return messageId || null;
    } catch (error) {
      this.logger.error(
        `Failed to send interactive message to ${normalizedTo}: ${error.message}`,
      );
      return null;
    }
  }

  /**
   * Envía un mensaje de texto simple (para confirmaciones de webhook).
   */
  async sendTextMessage(to: string, text: string): Promise<string | null> {
    if (!this.isConfigured) {
      this.logger.warn(
        `WhatsApp not configured. Skipping text message to ${to}`,
      );
      return null;
    }

    const normalizedTo = this.normalizePhone(to);

    const body = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: normalizedTo,
      type: 'text',
      text: { body: text },
    };

    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!response.ok) {
        const metaError = data?.error?.message || response.statusText;
        this.logger.error(
          `Failed to send text message to ${normalizedTo}: ${metaError}`,
        );
        return null;
      }

      const messageId = data?.messages?.[0]?.id;
      this.logger.log(
        `Text message sent to ${normalizedTo}. MessageId: ${messageId}`,
      );
      return messageId || null;
    } catch (error) {
      this.logger.error(
        `Failed to send text message to ${normalizedTo}: ${error.message}`,
      );
      return null;
    }
  }

  /**
   * Envía notificación de solicitud de edición de OP usando el template
   * "solicitud_edicion_op_v2" que incluye 3 botones integrados:
   *   - URL "🔗 Ver Orden" (botón 0, sufijo dinámico con orderId)
   *   - Quick Reply "✅ Autorizar" (botón 1, payload APPROVE)
   *   - Quick Reply "❌ Rechazar" (botón 2, payload REJECT)
   *
   * Después de enviar, guarda el messageId en DB para que el webhook pueda
   * resolver qué solicitud aprobar/rechazar cuando el admin toque un botón.
   *
   * IMPORTANTE: Los templates con quick-reply NO requieren ventana activa de 24h,
   * a diferencia de los mensajes interactivos no-template.
   */
  async notificarSolicitudConBotones(
    telefono: string,
    nombreSolicitante: string,
    rolSolicitante: string,
    numeroOrden: string,
    motivo: string,
    orderId: string,
    requestId: string,
  ): Promise<void> {
    const normalizedPhone = this.normalizePhone(telefono);

    // Enviar template v2 que ya contiene los 3 botones
    const messageId = await this.sendTemplateMessage(
      telefono,
      'solicitud_edicion_op_v2',
      [nombreSolicitante, rolSolicitante, numeroOrden, motivo],
      'es_CO',
      [{ index: 0, text: orderId }], // sufijo dinámico del botón URL "Ver Orden"
    );

    if (!messageId) {
      this.logger.warn(
        `Could not save WhatsApp action context for request ${requestId}: no messageId returned`,
      );
      return;
    }

    // Guardar contexto messageId → requestId para que el webhook lo resuelva
    try {
      await this.prisma.whatsappActionContext.create({
        data: {
          messageId,
          requestId,
          adminPhone: normalizedPhone,
          expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000), // 48 horas
        },
      });
      this.logger.debug(
        `WhatsApp action context saved: messageId=${messageId} requestId=${requestId}`,
      );
    } catch (error) {
      // No es crítico: si falla el guardado, el admin puede seguir gestionando desde el sistema
      this.logger.error(
        `Failed to save WhatsApp action context for messageId=${messageId}: ${error.message}`,
      );
    }
  }
}
