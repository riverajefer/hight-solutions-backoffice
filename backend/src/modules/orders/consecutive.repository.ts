import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class ConsecutiveRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Genera el siguiente número consecutivo para un tipo dado
   * Usa transacción para evitar duplicados en concurrencia
   */
  async getNextNumber(
    type: string,
    prefix: string,
    year: number = new Date().getFullYear(),
  ): Promise<string> {
    const consecutive = await this.prisma.$transaction(async (tx) => {
      // Buscar o crear el consecutivo para el tipo y año
      let record = await tx.consecutive.findUnique({
        where: { type },
      });

      if (!record) {
        // Crear nuevo consecutivo
        record = await tx.consecutive.create({
          data: {
            type,
            prefix,
            year,
            lastNumber: 1,
          },
        });
      } else {
        // Si cambió el año, resetear a 1
        if (record.year !== year) {
          record = await tx.consecutive.update({
            where: { type },
            data: {
              year,
              lastNumber: 1,
            },
          });
        } else {
          // Incrementar número
          record = await tx.consecutive.update({
            where: { type },
            data: {
              lastNumber: record.lastNumber + 1,
            },
          });
        }
      }

      return record;
    });

    // Formato: OP-2025-0001
    const numberStr = consecutive.lastNumber.toString().padStart(4, '0');
    return `${prefix}-${year}-${numberStr}`;
  }

  async findAll() {
    return this.prisma.consecutive.findMany({
      orderBy: { type: 'asc' },
    });
  }

  async reset(type: string) {
    return this.prisma.consecutive.update({
      where: { type },
      data: { lastNumber: 0 },
    });
  }
}
