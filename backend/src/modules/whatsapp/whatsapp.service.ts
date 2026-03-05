import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class WhatsappService {
  private readonly logger = new Logger(WhatsappService.name);
  private readonly baseUrl: string;
  private readonly accessToken: string;
  private readonly phoneNumberId: string;
  private readonly frontendUrl: string;
  private readonly isConfigured: boolean;

  constructor(private readonly configService: ConfigService) {
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
}
