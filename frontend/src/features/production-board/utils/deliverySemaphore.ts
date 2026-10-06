import type { Semaphore } from '../../../types/production-board.types';
import { WARNING_DAYS } from '../boardConfig';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

const startOfLocalDay = (date: Date): number =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();

/**
 * Días calendario entre hoy y la fecha de entrega, en la zona horaria del
 * usuario: negativo si ya pasó, 0 si es hoy. `null` cuando no hay fecha.
 */
export const getDaysToDelivery = (
  deliveryDate: string | null,
  today: Date = new Date(),
): number | null => {
  if (!deliveryDate) return null;
  const delivery = new Date(deliveryDate);
  if (isNaN(delivery.getTime())) return null;
  return Math.round((startOfLocalDay(delivery) - startOfLocalDay(today)) / MS_PER_DAY);
};

export const getSemaphore = (
  deliveryDate: string | null,
  today: Date = new Date(),
  warningDays: number = WARNING_DAYS,
): Semaphore => {
  const days = getDaysToDelivery(deliveryDate, today);
  if (days === null) return 'no-date';
  if (days < 0) return 'overdue';
  if (days <= warningDays) return 'warning';
  return 'on-time';
};

/** Texto corto de la tarjeta: «Vencida hace 2 d», «Hoy», «Mañana», «En 5 d», «Sin fecha». */
export const getDeliveryLabel = (
  deliveryDate: string | null,
  today: Date = new Date(),
): string => {
  const days = getDaysToDelivery(deliveryDate, today);
  if (days === null) return 'Sin fecha';
  if (days < 0) return `Vencida hace ${-days} d`;
  if (days === 0) return 'Hoy';
  if (days === 1) return 'Mañana';
  return `En ${days} d`;
};
