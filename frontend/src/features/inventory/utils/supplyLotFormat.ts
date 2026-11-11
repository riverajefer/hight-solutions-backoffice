import { SupplyLotUser } from '../../../types';

/** Cantidad con hasta 2 decimales y la unidad: «99,5 m». */
export const formatLotQuantity = (value: number, unit?: string): string =>
  `${value.toLocaleString('es-CO', { maximumFractionDigits: 2 })}${unit ? ` ${unit}` : ''}`;

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
