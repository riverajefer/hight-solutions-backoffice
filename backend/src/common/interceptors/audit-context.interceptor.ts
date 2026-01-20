import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { setAuditContextFromRequest, clearAuditContext } from '../utils/audit-context';
import { Request } from 'express';

/**
 * Interceptor que establece el contexto de auditoría desde la solicitud HTTP
 * Captura el ID del usuario (si está autenticado), IP y User-Agent
 */
@Injectable()
export class AuditContextInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();
    
    // Obtener el ID del usuario del contexto de autenticación si existe
    const userId = (request as any)?.user?.id;
    
    // Establecer el contexto de auditoría
    setAuditContextFromRequest(request, userId);

    // Limpiar el contexto después de completar la solicitud
    return next.handle().pipe(
      tap(() => {
        clearAuditContext();
      }),
      // También capturar errores para limpiar el contexto
      (observable) =>
        new Observable((subscriber) => {
          const subscription = observable.subscribe({
            next: (value) => subscriber.next(value),
            error: (error) => {
              clearAuditContext();
              subscriber.error(error);
            },
            complete: () => {
              clearAuditContext();
              subscriber.complete();
            },
          });
          return () => {
            subscription.unsubscribe();
            clearAuditContext();
          };
        }),
    );
  }
}
