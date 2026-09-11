import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { Request } from 'express';
import { setAuditUserId } from '../utils/audit-context';

/**
 * Completa el usuario autenticado en el contexto de auditoría del request.
 *
 * El contexto (IP, User-Agent) lo abre `AuditContextMiddleware`; aquí solo se
 * agrega el usuario, que existe en `req.user` después de los guards. No hay que
 * limpiar nada al terminar: el contexto vive y muere con su propio request.
 */
@Injectable()
export class AuditContextInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    if (context.getType() === 'http') {
      const request = context.switchToHttp().getRequest<Request>();
      setAuditUserId((request as any)?.user?.id);
    }

    return next.handle();
  }
}
