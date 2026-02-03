import { Controller, Get, Query, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PrismaService } from '../../database/prisma.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('audit-logs')
@ApiBearerAuth('JWT-auth')
@Controller('audit-logs')
@UseGuards(JwtAuthGuard)
export class AuditLogsController {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Obtener todos los registros de auditoría con filtros y paginación
   * GET /audit-logs
   */
  @Get()
  @ApiOperation({ summary: 'Get all audit logs with filters' })
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

    const [logs, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    // Obtener los IDs únicos de usuarios
    const userIds = [...new Set(logs.map((log) => log.userId).filter(Boolean))];

    // Obtener los usuarios en una sola consulta
    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds as string[] } },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
      },
    });

    // Crear un mapa de usuarios por ID
    const usersMap = new Map(users.map((user) => [user.id, user]));

    // Mapear los logs con la información del usuario
    const data = logs.map((log) => ({
      ...log,
      user: log.userId ? usersMap.get(log.userId) || null : null,
    }));

    return {
      data,
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
  @ApiOperation({ summary: 'Get audit logs by user' })
  async getAuditLogsByUser(@Param('userId') userId: string) {
    const logs = await this.prisma.auditLog.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 100, // Limitar a últimos 100 registros
    });

    // Obtener información del usuario
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
      },
    });

    // Mapear los logs con la información del usuario
    return logs.map((log) => ({
      ...log,
      user,
    }));
  }

  /**
   * Obtener registros de auditoría de un modelo específico
   * GET /audit-logs/model/:modelName
   */
  @Get('model/:modelName')
  @ApiOperation({ summary: 'Get audit logs by model' })
  async getAuditLogsByModel(@Param('modelName') modelName: string) {
    const logs = await this.prisma.auditLog.findMany({
      where: { model: modelName },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    // Obtener los IDs únicos de usuarios
    const userIds = [...new Set(logs.map((log) => log.userId).filter(Boolean))];

    // Obtener los usuarios en una sola consulta
    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds as string[] } },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
      },
    });

    // Crear un mapa de usuarios por ID
    const usersMap = new Map(users.map((user) => [user.id, user]));

    // Mapear los logs con la información del usuario
    return logs.map((log) => ({
      ...log,
      user: log.userId ? usersMap.get(log.userId) || null : null,
    }));
  }

  /**
   * Obtener historial de cambios de un registro específico
   * GET /audit-logs/record/:recordId
   * Para órdenes: trae los logs de la orden, sus items y sus pagos
   */
  @Get('record/:recordId')
  @ApiOperation({ summary: 'Get audit logs by record ID' })
  async getRecordHistory(@Param('recordId') recordId: string) {
    // Buscar logs directos del registro (ej: la orden misma)
    // + logs de OrderItem y Payment que tienen orderId en sus datos
    // usando raw query para buscar en campos JSON de PostgreSQL
    const logs = await this.prisma.$queryRaw<any[]>`
      SELECT * FROM audit_logs
      WHERE record_id = ${recordId}
         OR (model = 'OrderItem' AND (
              new_data->>'orderId' = ${recordId}
           OR old_data->>'orderId' = ${recordId}
         ))
         OR (model = 'Payment' AND (
              new_data->>'orderId' = ${recordId}
           OR old_data->>'orderId' = ${recordId}
         ))
      ORDER BY created_at ASC
    `;

    // Normalizar los nombres de columna (PostgreSQL retorna snake_case)
    const normalizedLogs = logs.map((log) => ({
      id: log.id,
      userId: log.user_id,
      action: log.action,
      model: log.model,
      recordId: log.record_id,
      oldData: log.old_data,
      newData: log.new_data,
      changedFields: log.changed_fields,
      ipAddress: log.ip_address,
      userAgent: log.user_agent,
      metadata: log.metadata,
      createdAt: log.created_at,
    }));

    // Obtener los IDs únicos de usuarios
    const userIds = [...new Set(normalizedLogs.map((log) => log.userId).filter(Boolean))];

    // Obtener los usuarios en una sola consulta
    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds as string[] } },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
      },
    });

    // Crear un mapa de usuarios por ID
    const usersMap = new Map(users.map((user) => [user.id, user]));

    // Mapear los logs con la información del usuario
    return normalizedLogs.map((log) => ({
      ...log,
      user: log.userId ? usersMap.get(log.userId) || null : null,
    }));
  }

  /**
   * Obtener últimos registros de auditoría
   * GET /audit-logs/latest
   */
  @Get('latest')
  @ApiOperation({ summary: 'Get latest audit logs' })
  async getLatestAuditLogs() {
    const logs = await this.prisma.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    // Obtener los IDs únicos de usuarios
    const userIds = [...new Set(logs.map((log) => log.userId).filter(Boolean))];

    // Obtener los usuarios en una sola consulta
    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds as string[] } },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
      },
    });

    // Crear un mapa de usuarios por ID
    const usersMap = new Map(users.map((user) => [user.id, user]));

    // Mapear los logs con la información del usuario
    return logs.map((log) => ({
      ...log,
      user: log.userId ? usersMap.get(log.userId) || null : null,
    }));
  }
}
