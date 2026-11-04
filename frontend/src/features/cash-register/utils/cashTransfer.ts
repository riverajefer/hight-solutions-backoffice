import { formatCurrency } from '../../../utils/formatters';

/** Ingresos y depósitos entran al cajón; egresos y retiros salen. */
export const isIncomeMovement = (type: string) => type === 'INCOME' || type === 'DEPOSIT';

export const formatDateTime = (value: string | null | undefined) =>
  value
    ? new Date(value).toLocaleString('es-CO', {
        timeZone: 'America/Bogota',
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    : '—';

/** «+$3.114», «-$5.862», «$0». */
export const formatSigned = (value: string | number) => {
  const n = Number(value);
  return n === 0 ? '$0' : `${n > 0 ? '+' : ''}${formatCurrency(n)}`;
};
