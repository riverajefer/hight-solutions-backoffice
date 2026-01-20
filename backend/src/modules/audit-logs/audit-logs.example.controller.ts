import { Controller, Get, Query, Param } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Controller('audit-logs')
export class AuditLogsExampleController {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Obtener todos los registros de auditoría con filtros y paginación
   * GET /audit-logs
   */
  @Get()
  async findAll(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
    @Query('userId') userId?: string,
    @Query('action') action?: string,
    @Query('model') model?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const skip = (Number(page) - 1) * Number(limit);
    const take = Number(limit);

    const where: any = {};
    if (userId) where.userId = userId;
    if (action) where.action = action;
    if (model) where.model = model;
    
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        where.createdAt.lte = end;
      }
    }

    const [data, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    // Obtener detalles de los usuarios para los logs encontrados
    const userIds = [...new Set(data.map((log) => log.userId).filter(Boolean))] as string[];
    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
      },
    });

    // Mapear los usuarios a los logs
    const dataWithUsers = data.map((log) => ({
      ...log,
      user: users.find((u) => u.id === log.userId) || null,
    }));

    return {
      data: dataWithUsers,
      total,
      page: Number(page),
      limit: Number(limit),
    };
  }

  /**
   * Obtener registros de auditoría de un usuario específico
   * GET /audit-logs/user/:userId
   */
  @Get('user/:userId')
  async getAuditLogsByUser(@Param('userId') userId: string) {
    // ... (mantenemos los métodos existentes por compatibilidad)

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
