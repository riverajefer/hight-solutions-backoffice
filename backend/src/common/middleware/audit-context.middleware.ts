import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import {
  buildAuditContextFromRequest,
  runWithAuditContext,
} from '../utils/audit-context';

/**
 * Abre el contexto de auditoría del request (IP y User-Agent).
 *
 * Todo lo que corre después de `next()` hereda este contexto: guards,
 * interceptores, el handler con sus transacciones de Prisma, el
 * AllExceptionsFilter y el log de fin de request de pino. El usuario lo completa
 * `AuditContextInterceptor`, porque `req.user` solo existe después de los guards.
 */
@Injectable()
export class AuditContextMiddleware implements NestMiddleware {
  use(req: Request, _res: Response, next: NextFunction): void {
    runWithAuditContext(buildAuditContextFromRequest(req), next);
  }
}
