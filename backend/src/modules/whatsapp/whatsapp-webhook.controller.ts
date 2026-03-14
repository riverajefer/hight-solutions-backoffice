import {
  Controller,
  Get,
  Post,
  Query,
  Body,
  Headers,
  RawBody,
  HttpCode,
  HttpStatus,
  Logger,
  ForbiddenException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiTags, ApiOperation, ApiExcludeController } from '@nestjs/swagger';
import { WhatsappWebhookService } from './whatsapp-webhook.service';

/**
 * Webhook receptor de eventos entrantes de WhatsApp (Meta Cloud API).
 * Este controller es público — la seguridad se maneja mediante:
 *   1. Verificación de firma X-Hub-Signature-256 (Meta App Secret)
 *   2. HMAC por botón (WHATSAPP_ACTION_SECRET)
 *
 * NO requiere JWT porque Meta no puede enviar tokens de usuario.
 */
@ApiExcludeController()
@ApiTags('webhooks')
@Controller('webhooks/whatsapp')
export class WhatsappWebhookController {
  private readonly logger = new Logger(WhatsappWebhookController.name);

  constructor(
    private readonly webhookService: WhatsappWebhookService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Verificación de webhook de Meta (GET).
   * Meta llama este endpoint para confirmar que la URL es válida.
   * Responde con hub.challenge si hub.verify_token coincide.
   *
   * NOTA: NestJS/Express usa `qs` que parsea "hub.mode" como objeto anidado
   * { hub: { mode, verify_token, challenge } }, NO como clave plana "hub.mode".
   * Por eso se usa @Query() query y se accede vía query.hub.*
   */
  @Get()
  @ApiOperation({ summary: 'Meta webhook verification' })
  verifyWebhook(@Query() query: Record<string, any>): string {
    // qs parsea "hub.mode=subscribe" como clave plana { 'hub.mode': 'subscribe' }
    // NO como objeto anidado { hub: { mode: 'subscribe' } }
    // Por eso se accede con bracket notation query['hub.mode']
    const mode = query['hub.mode'] as string;
    const verifyToken = query['hub.verify_token'] as string;
    const challenge = query['hub.challenge'] as string;

    const configuredToken = this.configService.get<string>(
      'whatsapp.verifyToken',
    );

    if (mode === 'subscribe' && verifyToken === configuredToken) {
      this.logger.log('WhatsApp webhook verified successfully');
      return challenge;
    }

    this.logger.warn(
      `Webhook verification failed. mode=${mode} token_match=${verifyToken === configuredToken}`,
    );
    throw new ForbiddenException('Webhook verification failed');
  }

  /**
   * Receptor de eventos de WhatsApp (POST).
   * Meta envía aquí los mensajes, status updates y respuestas a botones.
   * SIEMPRE responde HTTP 200 para evitar que Meta reintente el envío.
   */
  @Post()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Receive WhatsApp webhook events' })
  async handleWebhook(
    @Body() body: Record<string, any>,
    @RawBody() rawBody: Buffer,
    @Headers('x-hub-signature-256') signature: string,
  ): Promise<{ status: string }> {
    // 1. Validar firma de Meta (protege contra payloads falsos)
    this.webhookService.verifyMetaSignature(rawBody, signature);

    // 2. Procesar el evento de forma asíncrona (no bloquea la respuesta)
    this.webhookService.processWebhook(body).catch((err) => {
      this.logger.error(`Async webhook processing error: ${err.message}`);
    });

    // 3. Responder 200 inmediatamente para que Meta no reintente
    return { status: 'ok' };
  }
}
