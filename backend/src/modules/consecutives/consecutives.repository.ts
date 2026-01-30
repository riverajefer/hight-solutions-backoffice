import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class ConsecutivesRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Genera el siguiente número consecutivo para un tipo dado
   * Usa operaciones atómicas sin transacción explícita para mejor performance
   */
  async getNextNumber(
    type: string,
    prefix: string,
    year: number = new Date().getFullYear(),
  ): Promise<string> {
    // Primero verificar si existe el registro
    const existing = await this.prisma.consecutive.findUnique({
      where: { type },
      select: { year: true, lastNumber: true },
    });

    let consecutive;

    // Si no existe o cambió el año, usar upsert con reset
    if (!existing || existing.year !== year) {
      consecutive = await this.prisma.consecutive.upsert({
        where: { type },
        create: {
          type,
          prefix,
          year,
          lastNumber: 1,
        },
        update: {
          year,
          lastNumber: 1,
        },
      });
    } else {
      // Si existe y el año es correcto, incrementar
      consecutive = await this.prisma.consecutive.update({
        where: { type },
        data: {
          lastNumber: {
            increment: 1,
          },
        },
      });
    }

    // Formato: OP-2026-0001
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
