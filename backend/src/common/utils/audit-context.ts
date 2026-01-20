import { Request } from 'express';

// Variable global para almacenar el contexto de la solicitud actual
let currentRequestContext: {
  userId?: string;
  ipAddress?: string;
  userAgent?: string;
} = {};

/**
 * Obtiene el contexto actual para los registros de auditoría
 */
export function getAuditContext() {
  return {
    userId: currentRequestContext.userId,
    ipAddress: currentRequestContext.ipAddress,
    userAgent: currentRequestContext.userAgent,
  };
}

/**
 * Establece el contexto de auditoría desde una solicitud HTTP
 */
export function setAuditContextFromRequest(req: Request, userId?: string) {
  currentRequestContext = {
    userId: userId,
    ipAddress:
      (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() ||
      req.socket.remoteAddress ||
      'unknown',
    userAgent: req.headers['user-agent'] || 'unknown',
  };
}

/**
 * Limpia el contexto de auditoría
 */
export function clearAuditContext() {
  currentRequestContext = {};
}
