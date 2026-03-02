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
  private pool: Pool;

  constructor() {
    // Extraer connection_limit de la URL si existe, de lo contrario usar un default menor para evitar MaxClientsInSessionMode
    let maxConnections = 3;
    try {
      if (process.env.DATABASE_URL) {
        const url = new URL(process.env.DATABASE_URL);
        const limitStr = url.searchParams.get('connection_limit');
        if (limitStr) maxConnections = parseInt(limitStr, 10);
      }
    } catch {
      // Ignorar errores de parseo
    }

    const pool = new Pool({ 
      connectionString: process.env.DATABASE_URL,
      max: maxConnections 
    });
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

    this.pool = pool;

    // Aplicar extensión de auditoría
    const extended = this.$extends(
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
    );

    // Asegurar que el pool y métodos de NestJS estén en el proxy devuelto
    Object.assign(extended, {
      pool,
      onModuleInit: this.onModuleInit.bind(this),
      onModuleDestroy: async () => {
        await this.$disconnect();
        if (pool) await pool.end();
      },
      cleanDatabase: this.cleanDatabase.bind(this)
    });

    return extended as unknown as PrismaService;
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
