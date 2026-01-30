import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '../generated/prisma';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import { auditLogExtension } from '@explita/prisma-audit-log';
import { getAuditContext } from '../common/utils/audit-context';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    const adapter = new PrismaBetterSqlite3({ url: process.env.DATABASE_URL });
    super({
      adapter,
      log: process.env.NODE_ENV === 'development'
        ? ['query', 'info', 'warn', 'error']
        : ['error'],
      // Aumentar timeout de transacciones interactivas a 15 segundos
      transactionOptions: {
        maxWait: 45000, // Tiempo máximo de espera para adquirir la transacción
        timeout: 45000, // Tiempo máximo de ejecución de la transacción
      },
    });

    // Aplicar extensión de auditoría
    return this.$extends(
      auditLogExtension({
        // Obtener contexto para los registros de auditoría
        getContext: () => {
          const context = getAuditContext();
          return {
            userId: context.userId,
            ipAddress: context.ipAddress,
            metadata: {
              userAgent: context.userAgent,
            },
          };
        },

        // Enmascarar campos sensibles
        maskFields: ['password', 'refreshToken'],
        maskValue: '[REDACTED]',

        // Configurar inclusión/exclusión de campos por modelo
        fieldFilters: {
          User: {
            exclude: ['password', 'refreshToken'],
          },
          // Order, OrderItem y Payment se excluyen completamente en skip()
        },

        // Registrador personalizado (opcional)
        logger: (log) => {
          // Solo loguear en desarrollo y excluir modelos pesados para mejorar performance
          if (process.env.NODE_ENV === 'development') {
            const heavyModels = ['Order', 'OrderItem', 'Payment'];
            const logs = Array.isArray(log) ? log : [log];

            // Filtrar logs de modelos pesados
            const filteredLogs = logs.filter(
              (l) => !heavyModels.includes(l.model || '')
            );

            if (filteredLogs.length > 0) {
              console.log('AUDIT LOG:', filteredLogs.length === 1 ? filteredLogs[0] : filteredLogs);
            }
          }
        },

        // Saltar registro para operaciones específicas
        skip: ({ model }) => {
          // No registrar cambios en modelos de infraestructura y módulos críticos de performance
          return (
            model === 'AuditLog' ||
            model === 'audit_logs' ||
            model === 'Consecutive' || // Excluir consecutivos (operación crítica de concurrencia)
            model === 'Order' || // Excluir órdenes (transacciones complejas)
            model === 'OrderItem' || // Excluir items de órdenes
            model === 'Payment' // Excluir pagos (transacciones críticas)
          );
        },
      })
    ) as unknown as PrismaService;
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  /**
   * Método helper para limpiar la base de datos en tests
   */
  async cleanDatabase() {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Cannot clean database in production');
    }

    const models = Reflect.ownKeys(this).filter((key) => {
      return (
        typeof key === 'string' &&
        !key.startsWith('_') &&
        !key.startsWith('$') &&
        typeof (this as any)[key]?.deleteMany === 'function'
      );
    });

    return Promise.all(
      models.map((model) => (this as any)[model].deleteMany()),
    );
  }
}
