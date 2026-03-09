import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { Request } from 'express';
import { AttendanceService } from '../../modules/attendance/attendance.service';

/**
 * Interceptor que registra heartbeats de actividad para el Control de Asistencia.
 * Solo actúa en requests autenticados y aplica debounce en memoria para evitar
 * saturar la base de datos (máximo 1 heartbeat por usuario cada 5 minutos).
 */
@Injectable()
export class HeartbeatInterceptor implements NestInterceptor {
  private readonly debounceMap = new Map<string, number>(); // userId → timestamp ms
  private readonly DEBOUNCE_MS = 5 * 60 * 1000; // 5 minutos

  constructor(private readonly attendanceService: AttendanceService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();
    const userId = (request as any)?.user?.id;

    if (userId) {
      const now = Date.now();
      const lastBeat = this.debounceMap.get(userId) ?? 0;

      if (now - lastBeat > this.DEBOUNCE_MS) {
        this.debounceMap.set(userId, now);
        const endpoint = request.path;
        // Fire & forget: no bloquea el request
        this.attendanceService.recordHeartbeat(userId, endpoint).catch(() => {});
      }
    }

    return next.handle();
  }
}
