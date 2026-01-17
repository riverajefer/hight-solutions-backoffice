import { Controller, Get, Param } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

/**
 * Controlador de ejemplo para gestionar registros de auditoría
 * Nota: En una aplicación real, esto debería ser un módulo separado con servicios
 */
@Controller('audit-logs')
export class AuditLogsExampleController {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Obtener registros de auditoría de un usuario específico
   * GET /audit-logs/user/:userId
   */
  @Get('user/:userId')
  async getAuditLogsByUser(@Param('userId') userId: string) {
    return this.prisma.auditLog.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 100, // Limitar a últimos 100 registros
    });
  }

  /**
   * Obtener registros de auditoría de un modelo específico
   * GET /audit-logs/model/:modelName
   */
  @Get('model/:modelName')
  async getAuditLogsByModel(@Param('modelName') modelName: string) {
    return this.prisma.auditLog.findMany({
      where: { model: modelName },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  /**
   * Obtener historial de cambios de un registro específico
   * GET /audit-logs/record/:recordId
   */
  @Get('record/:recordId')
  async getRecordHistory(@Param('recordId') recordId: string) {
    return this.prisma.auditLog.findMany({
      where: { recordId },
      orderBy: { createdAt: 'asc' }, // Orden cronológico
    });
  }

  /**
   * Obtener últimos registros de auditoría
   * GET /audit-logs/latest
   */
  @Get('latest')
  async getLatestAuditLogs() {
    return this.prisma.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }
}
