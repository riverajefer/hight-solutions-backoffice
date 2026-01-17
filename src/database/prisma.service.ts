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
        : ['error'] 
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
          if (process.env.NODE_ENV === 'development') {
            console.log('AUDIT LOG:', log);
          }
        },

        // Saltar registro para operaciones específicas
        skip: ({ model }) => {
          // No registrar cambios en el modelo AuditLog mismo
          return model === 'AuditLog' || model === 'audit_logs';
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
