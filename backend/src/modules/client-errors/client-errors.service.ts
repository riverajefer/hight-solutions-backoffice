import { Injectable, Logger } from '@nestjs/common';
import { ReportClientErrorDto } from './dto/report-client-error.dto';

export interface ClientErrorRequestContext {
  ip?: string;
  userAgent?: string;
}

/**
 * Registra en el log estructurado los errores que ocurren en el navegador.
 *
 * No persiste en base de datos a propósito: el destino es Grafana Loki, que ya
 * recibe el resto de los logs vía pino. Se consultan con la etiqueta
 * `context="ClientErrorsService"` o buscando `clientError`.
 */
@Injectable()
export class ClientErrorsService {
  private readonly logger = new Logger(ClientErrorsService.name);

  report(dto: ReportClientErrorDto, context: ClientErrorRequestContext): void {
    // El objeto se emite como campos estructurados para poder filtrar en Loki
    // por tipo de error, ruta o usuario sin tener que parsear el mensaje.
    this.logger.error({
      msg: `[client] ${dto.message}`,
      clientError: {
        kind: dto.kind ?? 'render',
        message: dto.message,
        stack: dto.stack,
        componentStack: dto.componentStack,
        url: dto.url,
        // Reportado por el frontend, no verificado: el endpoint es público.
        reportedUserId: dto.userId,
        environment: dto.environment,
        userAgent: context.userAgent,
        ip: context.ip,
      },
    });
  }
}
