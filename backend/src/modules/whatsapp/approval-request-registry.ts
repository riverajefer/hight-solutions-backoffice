import { Injectable, Logger } from '@nestjs/common';

/**
 * Información mínima que el webhook necesita para validar y responder.
 * Cada handler la construye a partir de su modelo de dominio.
 */
export interface ApprovalRequestInfo {
  id: string;
  status: string; // 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXPIRED'
  requestedById: string;
  /** Etiqueta legible para mensajes WhatsApp, e.g. "la Orden de Pedido OP-2026-001" */
  displayLabel: string;
}

/**
 * Interfaz que cada módulo de aprobación implementa para integrarse
 * con el flujo genérico de WhatsApp (webhook → registry → handler).
 */
export interface ApprovalRequestHandler {
  /** Buscar la solicitud. Retorna null si no existe. */
  findPendingRequest(requestId: string): Promise<ApprovalRequestInfo | null>;

  /** Ejecutar lógica de aprobación vía WhatsApp. */
  approveViaWhatsApp(requestId: string, reviewerId: string): Promise<void>;

  /** Ejecutar lógica de rechazo vía WhatsApp. */
  rejectViaWhatsApp(requestId: string, reviewerId: string): Promise<void>;

  /**
   * Opcional: buscar el reviewer por teléfono con lógica custom.
   * Si no se implementa, el webhook usa findAdminByPhone (role=admin) por defecto.
   * Útil para módulos que validan por permiso en vez de por rol.
   */
  findReviewerByPhone?(phone: string): Promise<{ id: string } | null>;
}

/**
 * Registry centralizado de handlers de aprobación.
 * Cada módulo se registra en onModuleInit con su ApprovalRequestType.
 * El webhook usa este registry para despachar approve/reject al handler correcto.
 */
@Injectable()
export class ApprovalRequestRegistry {
  private readonly logger = new Logger(ApprovalRequestRegistry.name);
  private readonly handlers = new Map<string, ApprovalRequestHandler>();

  register(requestType: string, handler: ApprovalRequestHandler): void {
    this.handlers.set(requestType, handler);
    this.logger.log(`Registered approval handler for type: ${requestType}`);
  }

  getHandler(requestType: string): ApprovalRequestHandler | undefined {
    return this.handlers.get(requestType);
  }

  hasHandler(requestType: string): boolean {
    return this.handlers.has(requestType);
  }
}
