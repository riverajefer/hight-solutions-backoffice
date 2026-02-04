import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '../generated/prisma';
import { auditLogExtension } from '@explita/prisma-audit-log';
import { getAuditContext } from '../common/utils/audit-context';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const adapter = new PrismaPg(pool);
    super({
      adapter,
      log: process.env.NODE_ENV === 'development'
        ? ['query', 'info', 'warn', 'error']
        : ['error'],
      // Aumentar timeout de transacciones interactivas
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
        },

        // Registrador personalizado (opcional)
        logger: (log) => {
          // Solo loguear en desarrollo
          if (process.env.NODE_ENV === 'development') {
            const logs = Array.isArray(log) ? log : [log];
            if (logs.length > 0) {
              console.log('AUDIT LOG:', logs.length === 1 ? logs[0] : logs);
            }
          }
        },

        // Saltar registro para operaciones específicas
        skip: ({ model }) => {
          return (
            model === 'AuditLog' ||
            model === 'audit_logs' ||
            model === 'Consecutive' // Excluir consecutivos (operación crítica de concurrencia)
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
