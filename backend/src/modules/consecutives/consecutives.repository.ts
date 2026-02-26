import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class ConsecutivesRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Genera el siguiente número consecutivo para un tipo dado
   * Usa INSERT ... ON CONFLICT atómico para evitar race conditions
   */
  async getNextNumber(
    type: string,
    prefix: string,
    year: number = new Date().getFullYear(),
  ): Promise<string> {
    // Atomic upsert + increment using raw SQL to prevent race conditions
    // If the year changed, resets to 1; otherwise increments atomically
    const result = await this.prisma.$queryRaw<
      Array<{ last_number: number }>
    >`
      INSERT INTO consecutives (id, type, prefix, year, last_number, created_at, updated_at)
      VALUES (gen_random_uuid(), ${type}, ${prefix}, ${year}, 1, NOW(), NOW())
      ON CONFLICT (type) DO UPDATE SET
        last_number = CASE
          WHEN consecutives.year = ${year} THEN consecutives.last_number + 1
          ELSE 1
        END,
        year = ${year},
        updated_at = NOW()
      RETURNING last_number
    `;

    const lastNumber = Number(result[0].last_number);
    const numberStr = lastNumber.toString().padStart(4, '0');
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

  /**
   * Sincroniza el contador de un tipo específico con el máximo existente en una tabla.
   * Útil para recuperar de desincronización entre el consecutivo y los registros reales.
   */
  async syncCounterFromTable(
    type: string,
    tableName: string,
    columnName: string,
    prefix: string,
    year: number = new Date().getFullYear(),
  ): Promise<void> {
    const pattern = `${prefix}-${year}-%`;
    const safeTable = tableName.replace(/[^a-z0-9_]/gi, '');
    const safeColumn = columnName.replace(/[^a-z0-9_]/gi, '');

    // Find max number used in the actual table
    const maxResult = await this.prisma.$queryRawUnsafe<
      Array<{ max_num: number | null }>
    >(
      `SELECT MAX(CAST(SPLIT_PART("${safeColumn}", '-', 3) AS INTEGER)) as max_num
       FROM "${safeTable}"
       WHERE "${safeColumn}" LIKE $1`,
      pattern,
    );

    const maxNum = Number(maxResult[0]?.max_num ?? 0);

    // Update the consecutive counter to be at least as high as the max
    await this.prisma.consecutive.upsert({
      where: { type },
      create: { type, prefix, year, lastNumber: maxNum },
      update: {
        year,
        lastNumber: maxNum,
      },
    });
  }
}
