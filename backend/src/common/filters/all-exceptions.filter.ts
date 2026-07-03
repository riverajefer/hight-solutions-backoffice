import {
  ArgumentsHost,
  Catch,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import { Request } from 'express';
import { getAuditContext } from '../utils/audit-context';

/**
 * Filtro de excepciones global.
 *
 * Registra los errores del servidor (5xx) con el STACK REAL de la excepción y el
 * contexto del request (userId, IP, método, ruta), para que en Grafana/Loki se pueda
 * diagnosticar la causa real — a diferencia del log de pino-http, que solo genera un
 * error sintético "request errored" sin la traza verdadera.
 *
 * Los 4xx no se registran aquí (ya los loguea pino-http como `warn` a nivel de request),
 * y el formato de la respuesta HTTP se delega al filtro base de NestJS para no alterar
 * las respuestas de validación ni de las HttpException.
 */
@Catch()
export class AllExceptionsFilter extends BaseExceptionFilter {
  private readonly logger = new Logger('ExceptionsFilter');

  catch(exception: unknown, host: ArgumentsHost): void {
    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    if (status >= 500) {
      const request = host.switchToHttp().getRequest<Request>();
      const { userId, ipAddress } = getAuditContext();

      this.logger.error(
        {
          err: exception,
          statusCode: status,
          method: request?.method,
          url: request?.url,
          userId,
          ip: ipAddress,
        },
        `Unhandled exception: ${request?.method} ${request?.url}`,
      );
    }

    // Delegar el formato de la respuesta al comportamiento por defecto de NestJS.
    super.catch(exception, host);
  }
}
