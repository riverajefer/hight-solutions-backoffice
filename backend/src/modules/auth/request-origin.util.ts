import { Request } from 'express';

/** IP (detrás del proxy de Railway) y user agent de la petición, para `session_logs`. */
export function getRequestOrigin(request: Request) {
  const ipAddress =
    (request.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
    request.ip ||
    request.socket.remoteAddress;

  return { ipAddress, userAgent: request.headers['user-agent'] };
}
