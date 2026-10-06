import { OrderStatus } from '../../generated/prisma';

/**
 * Estados que el tablero considera "trabajo abierto". PAID entra porque en el
 * flujo actual significa "pagada, pendiente de entregar" (READY → PAID → DELIVERED).
 */
export const BOARD_OPEN_STATUSES: OrderStatus[] = [
  OrderStatus.CONFIRMED,
  OrderStatus.IN_PRODUCTION,
  OrderStatus.READY,
  OrderStatus.PAID,
];

/** Los borradores viajan al frontend, que los oculta por defecto. */
export const BOARD_STATUSES: OrderStatus[] = [
  OrderStatus.DRAFT,
  ...BOARD_OPEN_STATUSES,
];

export const BOARD_DEFAULT_DAYS = 30;
export const BOARD_MAX_DAYS = 90;
