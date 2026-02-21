import { Injectable } from '@nestjs/common';
import { ConsecutivesRepository } from './consecutives.repository';

type ConsecutiveType = 'ORDER' | 'PRODUCTION' | 'EXPENSE' | 'QUOTE' | 'WORK_ORDER';

@Injectable()
export class ConsecutivesService {
  constructor(
    private readonly consecutivesRepository: ConsecutivesRepository,
  ) {}

  /**
   * Genera el siguiente número consecutivo para un tipo dado
   * Auto-resuelve el prefijo según el tipo
   *
   * @param type - Tipo de consecutivo (ORDER, PRODUCTION, EXPENSE, QUOTE)
   * @returns Número formateado (ej: "OP-2026-0001", "COT-2026-0001")
   */
  async generateNumber(type: ConsecutiveType): Promise<string> {
    const prefix = this.getPrefixForType(type);
    const currentYear = new Date().getFullYear();

    return this.consecutivesRepository.getNextNumber(type, prefix, currentYear);
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
   * Mapeo de tipos a prefijos
   * Centraliza la lógica de prefijos
   */
  private getPrefixForType(type: ConsecutiveType): string {
    const prefixMap: Record<ConsecutiveType, string> = {
      ORDER: 'OP',
      PRODUCTION: 'PROD',
      EXPENSE: 'GAS',
      QUOTE: 'COT',
      WORK_ORDER: 'OT',
    };

    return prefixMap[type];
  }
}

