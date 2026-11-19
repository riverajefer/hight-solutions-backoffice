import { SupplyLotUser } from '../../../types';

/** Cantidad con hasta 2 decimales y la unidad: «99,5 m». */
export const formatLotQuantity = (value: number, unit?: string): string =>
  `${value.toLocaleString('es-CO', { maximumFractionDigits: 2 })}${unit ? ` ${unit}` : ''}`;

/**
 * Cómo llamar a un lote según la unidad del insumo: lo que se mide en metros
 * viene en rollos (DTF, banner, cinta, tela); lo demás (carnets, pliegos, m²)
 * en lotes. Sin unidad conocida (listas que mezclan insumos) se dice
 * «rollo o lote». Las dos palabras son masculinas, así que los artículos
 * («el», «del», «este») no cambian.
 */
export interface LotTerms {
  /** rollo / lote / rollo o lote */
  noun: string;
  /** Rollo / Lote / Rollo o lote */
  Noun: string;
  /** rollos / lotes / rollos o lotes */
  plural: string;
  /** Largo inicial / Cantidad inicial */
  initialLabel: string;
  isRoll: boolean;
}

export const isRollUnit = (unit?: string | null): boolean => unit?.trim().toLowerCase() === 'm';

export const lotTerms = (unit?: string | null): LotTerms => {
  if (!unit) {
    return { noun: 'rollo o lote', Noun: 'Rollo o lote', plural: 'rollos o lotes', initialLabel: 'Cantidad inicial', isRoll: false };
  }
  return isRollUnit(unit)
    ? { noun: 'rollo', Noun: 'Rollo', plural: 'rollos', initialLabel: 'Largo inicial', isRoll: true }
    : { noun: 'lote', Noun: 'Lote', plural: 'lotes', initialLabel: 'Cantidad inicial', isRoll: false };
};

/** Solo la fecha, en hora de Colombia. */
export const formatLotDate = (iso: string | null | undefined): string =>
  iso
    ? new Date(iso).toLocaleDateString('es-CO', {
        timeZone: 'America/Bogota',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : '—';

export const formatLotUser = (user?: SupplyLotUser | null): string => {
  if (!user) return '—';
  const name = [user.firstName, user.lastName].filter(Boolean).join(' ').trim();
  return name || user.username || '—';
};
