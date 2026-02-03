import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { Prisma } from '../../generated/prisma';

/**
 * Servicio para registrar audit logs manualmente
 * Útil para modelos que no pueden usar el audit log extension automático
 */
@Injectable()
export class AuditLogsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Registra la creación de un registro
   */
  async logCreate(
    model: string,
    recordId: string,
    newData: any,
    userId?: string,
  ) {
    try {
      await this.prisma.auditLog.create({
        data: {
          action: 'CREATE',
          model,
          recordId,
          newData: newData as Prisma.InputJsonValue,
          userId: userId || null,
        },
      });
    } catch (error) {
      // No fallar la operación principal si falla el audit log
      console.error('Error creating audit log:', error);
    }
  }

  /**
   * Registra la actualización de un registro
   */
  async logUpdate(
    model: string,
    recordId: string,
    oldData: any,
    newData: any,
    userId?: string,
  ) {
    try {
      await this.prisma.auditLog.create({
        data: {
          action: 'UPDATE',
          model,
          recordId,
          oldData: oldData as Prisma.InputJsonValue,
          newData: newData as Prisma.InputJsonValue,
          userId: userId || null,
        },
      });
    } catch (error) {
      // No fallar la operación principal si falla el audit log
      console.error('Error creating audit log:', error);
    }
  }

  /**
   * Registra la eliminación de un registro
   */
  async logDelete(model: string, recordId: string, oldData: any, userId?: string) {
    try {
      await this.prisma.auditLog.create({
        data: {
          action: 'DELETE',
          model,
          recordId,
          oldData: oldData as Prisma.InputJsonValue,
          userId: userId || null,
        },
      });
    } catch (error) {
      // No fallar la operación principal si falla el audit log
      console.error('Error creating audit log:', error);
    }
  }

  /**
   * Registra un cambio complejo de orden con sus items
   * Este método crea un solo registro con un resumen de los cambios
   * Se ejecuta de forma asíncrona sin bloquear (fire-and-forget)
   */
  async logOrderChange(
    action: 'CREATE' | 'UPDATE' | 'DELETE',
    recordId: string,
    oldData: any,
    newData: any,
    userId?: string,
  ) {
    // Ejecutar en background sin esperar (fire-and-forget)
    setImmediate(async () => {
      try {
        // Simplificar los datos para evitar objetos muy grandes
        const simplifiedOldData = oldData
          ? {
              orderNumber: oldData.orderNumber,
              status: oldData.status,
              subtotal: oldData.subtotal?.toString(),
              tax: oldData.tax?.toString(),
              total: oldData.total?.toString(),
              paidAmount: oldData.paidAmount?.toString(),
              balance: oldData.balance?.toString(),
              itemsCount: oldData.items?.length || 0,
              paymentsCount: oldData.payments?.length || 0,
              notes: oldData.notes,
            }
          : null;

        const simplifiedNewData = newData
          ? {
              orderNumber: newData.orderNumber,
              status: newData.status,
              subtotal: newData.subtotal?.toString(),
              tax: newData.tax?.toString(),
              total: newData.total?.toString(),
              paidAmount: newData.paidAmount?.toString(),
              balance: newData.balance?.toString(),
              itemsCount: newData.items?.length || 0,
              paymentsCount: newData.payments?.length || 0,
              notes: newData.notes,
            }
          : null;

        await this.prisma.auditLog.create({
          data: {
            action,
            model: 'Order',
            recordId,
            oldData: simplifiedOldData as Prisma.InputJsonValue,
            newData: simplifiedNewData as Prisma.InputJsonValue,
            userId: userId || null,
          },
        });
      } catch (error) {
        // No fallar la operación principal si falla el audit log
        console.error('Error creating order audit log:', error);
      }
    });
  }
}
