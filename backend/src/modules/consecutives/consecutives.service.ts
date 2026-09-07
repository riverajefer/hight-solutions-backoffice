import { Injectable } from '@nestjs/common';
import { ConsecutivesRepository } from './consecutives.repository';

type ConsecutiveType = 'ORDER' | 'PRODUCTION' | 'EXPENSE' | 'QUOTE' | 'WORK_ORDER' | 'PRODUCTION_ORDER' | 'CASH_RECEIPT' | 'DTF_TEXTIL' | 'DTF_UV';

/**
 * Dónde vive realmente cada consecutivo. Es la fuente de verdad del número:
 * el contador de `consecutives` es solo una caché que puede quedar atrás
 * (datos sembrados, inserciones manuales, restauración de un backup).
 *
 * `PRODUCTION` no tiene tabla: es un tipo heredado que ya nadie genera. Se deja
 * en `null` explícito para que no se confunda con un olvido.
 */
const CONSECUTIVE_SOURCES: Record<
  ConsecutiveType,
  { table: string; column: string } | null
> = {
  ORDER: { table: 'orders', column: 'order_number' },
  PRODUCTION: null,
  EXPENSE: { table: 'expense_orders', column: 'og_number' },
  QUOTE: { table: 'quotes', column: 'quote_number' },
  WORK_ORDER: { table: 'work_orders', column: 'work_order_number' },
  PRODUCTION_ORDER: { table: 'production_orders', column: 'oprod_number' },
  CASH_RECEIPT: { table: 'cash_movements', column: 'receipt_number' },
  DTF_TEXTIL: { table: 'dtf_records', column: 'consecutive' },
  DTF_UV: { table: 'dtf_records', column: 'consecutive' },
};

@Injectable()
export class ConsecutivesService {
  constructor(
    private readonly consecutivesRepository: ConsecutivesRepository,
  ) {}

  /**
   * Genera el siguiente número consecutivo para un tipo dado
   * Auto-resuelve el prefijo según el tipo
   *
   * El número se calcula contra el máximo real de la tabla destino, así que no
   * puede devolver uno ya usado aunque el contador esté desincronizado. Sin
   * eso, la creación revienta con P2002 y varios de los puntos de creación
   * (abonos, movimientos de caja, órdenes de producción) generan el número
   * dentro de una transacción, donde no hay forma de reintentar.
   *
   * @param type - Tipo de consecutivo (ORDER, PRODUCTION, EXPENSE, QUOTE)
   * @returns Número formateado (ej: "OP-2026-0001", "COT-2026-0001")
   */
  async generateNumber(type: ConsecutiveType): Promise<string> {
    const prefix = this.getPrefixForType(type);
    const currentYear = new Date().getFullYear();

    return this.consecutivesRepository.getNextNumber(
      type,
      prefix,
      currentYear,
      CONSECUTIVE_SOURCES[type] ?? undefined,
    );
  }

  /**
   * Sincroniza el contador con los datos reales de la tabla correspondiente.
   * Se usa para recuperarse de desincronizaciones cuando falla la creación por número duplicado.
   */
  async syncCounter(type: ConsecutiveType): Promise<void> {
    const prefix = this.getPrefixForType(type);
    const config = CONSECUTIVE_SOURCES[type];
    if (!config) return;

    return this.consecutivesRepository.syncCounterFromTable(
      type,
      config.table,
      config.column,
      prefix,
    );
  }

  /**
   * Obtiene todos los consecutivos
   */
  async findAll() {
    return this.consecutivesRepository.findAll();
  }

  /**
   * Reinicia el contador de un tipo específico
   */
  async reset(type: ConsecutiveType) {
    return this.consecutivesRepository.reset(type);
  }

  /**
   * Sincroniza el contador con los datos reales de la tabla correspondiente.
   * Se usa para recuperarse de desincronizaciones.
   */
  async syncWorkOrderCounter(): Promise<void> {
    return this.consecutivesRepository.syncCounterFromTable(
      'WORK_ORDER',
      'work_orders',
      'work_order_number',
      'OT',
    );
  }

  /**
   * Mapeo de tipos a prefijos
   * Centraliza la lógica de prefijos
   */
  private getPrefixForType(type: ConsecutiveType): string {
    const prefixMap: Record<ConsecutiveType, string> = {
      ORDER: 'OP',
      PRODUCTION: 'PROD',
      EXPENSE: 'OG',
      QUOTE: 'COT',
      WORK_ORDER: 'OT',
      PRODUCTION_ORDER: 'OPROD',
      CASH_RECEIPT: 'RC',
      DTF_TEXTIL: 'DTF-TEXTIL',
      DTF_UV: 'DTF-UV',
    };

    return prefixMap[type];
  }
}

