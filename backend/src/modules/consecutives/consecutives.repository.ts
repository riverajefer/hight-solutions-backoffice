import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class ConsecutivesRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Genera el siguiente número consecutivo para un tipo dado
   * Usa INSERT ... ON CONFLICT atómico para evitar race conditions
   *
   * Con `source` (tabla y columna donde vive el número), el incremento se toma
   * contra el máximo real de esa tabla, no solo contra el contador. Es lo que
   * hace que el contador no pueda quedar por detrás de los datos: si alguien
   * sembró registros o los insertó a mano, `generateNumber` igual devuelve un
   * número libre en vez de uno ya usado (P2002 al crear).
   *
   * La corrección va aquí y no en cada servicio porque varios de los puntos de
   * creación generan el número dentro de una transacción, donde reintentar no
   * es posible: el primer error aborta la transacción completa.
   */
  async getNextNumber(
    type: string,
    prefix: string,
    year: number = new Date().getFullYear(),
    source?: { table: string; column: string },
  ): Promise<string> {
    const result = source
      ? await this.getNextNumberFromSource(type, prefix, year, source)
      : await this.getNextNumberFromCounter(type, prefix, year);

    if (!result || result.length === 0) {
      throw new Error(`Failed to generate next number for ${type}`);
    }

    const lastNumber = Number(result[0].last_number);
    const numberStr = lastNumber.toString().padStart(4, '0');
    return `${prefix}-${year}-${numberStr}`;
  }

  /**
   * Incremento atómico contra el contador únicamente.
   * Es correcto mientras nadie inserte registros por fuera del contador.
   */
  private async getNextNumberFromCounter(
    type: string,
    prefix: string,
    year: number,
  ): Promise<Array<{ last_number: number }>> {
    // Atomic upsert + increment using raw SQL to prevent race conditions
    // If the year changed, resets to 1; otherwise increments atomically
    return this.prisma.$queryRaw<Array<{ last_number: number }>>`
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
  }

  /**
   * Incremento atómico contra el mayor entre el contador y el máximo real de la
   * tabla destino. Una sola sentencia: el GREATEST se evalúa con la fila del
   * contador ya bloqueada, así que dos peticiones concurrentes siguen sin poder
   * obtener el mismo número.
   */
  private async getNextNumberFromSource(
    type: string,
    prefix: string,
    year: number,
    source: { table: string; column: string },
  ): Promise<Array<{ last_number: number }>> {
    const safeTable = source.table.replace(/[^a-z0-9_]/gi, '');
    const safeColumn = source.column.replace(/[^a-z0-9_]/gi, '');
    const pattern = `${prefix}-${year}-%`;

    // Mismo criterio de extracción que `syncCounterFromTable`: los dígitos
    // finales, para que funcione con prefijos que llevan guión (ej. "DTF-UV").
    const maxInTable = `
      SELECT COALESCE(
        MAX(CAST(SUBSTRING("${safeColumn}" FROM '([0-9]+)$') AS INTEGER)), 0
      )
      FROM "${safeTable}"
      WHERE "${safeColumn}" LIKE $4
    `;

    return this.prisma.$queryRawUnsafe<Array<{ last_number: number }>>(
      `
      INSERT INTO consecutives (id, type, prefix, year, last_number, created_at, updated_at)
      VALUES (gen_random_uuid(), $1, $2, $3, (${maxInTable}) + 1, NOW(), NOW())
      ON CONFLICT (type) DO UPDATE SET
        last_number = GREATEST(
          CASE WHEN consecutives.year = $3 THEN consecutives.last_number ELSE 0 END,
          (${maxInTable})
        ) + 1,
        year = $3,
        updated_at = NOW()
      RETURNING last_number
      `,
      type,
      prefix,
      year,
      pattern,
    );
  }

  /**
   * Obtiene el valor actual de un consecutivo sin incrementarlo.
   */
  async getCurrentNumber(type: string): Promise<number> {
    const consecutive = await this.prisma.consecutive.findUnique({
      where: { type },
    });
    return consecutive ? consecutive.lastNumber : 0;
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

    // Find max number used in the actual table.
    // Extrae los dígitos finales del consecutivo (el número), en vez de una posición
    // fija por guiones — así funciona aun con prefijos que contienen guión (ej. "DTF-TEXTIL").
    const maxResult = await this.prisma.$queryRawUnsafe<
      Array<{ max_num: number | null }>
    >(
      `SELECT MAX(CAST(SUBSTRING("${safeColumn}" FROM '([0-9]+)$') AS INTEGER)) as max_num
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
