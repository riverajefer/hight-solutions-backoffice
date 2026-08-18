// Definición de columnas para la hoja de detalle "Pagos" de Órdenes de Pedido.
// Cada fila representa UN abono, no una orden: una OP con tres abonos genera
// tres filas. Es lo que pide la conciliación bancaria, donde cada movimiento del
// extracto tiene que poder cruzarse contra un pago concreto; con el total
// abonado sumado en una sola celda ese cruce es imposible.

import type { Order, Payment } from '../../../types/order.types';
import { PAYMENT_METHOD_LABELS } from '../../../types/order.types';
import type { ExportColumn, ExportContext } from '../../../utils/excelExport';
import { formatDate } from './orderFormatters';

/** Fila de la hoja de pagos: un abono junto a su orden padre. */
export interface OrderPaymentRow {
  order: Order;
  payment: Payment;
}

/**
 * Expande una Orden en una fila por cada abono.
 *
 * Cuando el export se pidió por fecha de pago, el backend devuelve las órdenes
 * que tienen *algún* abono en el rango, pero cada una llega con **todos** sus
 * abonos. Si no se filtraran aquí, el Excel traería pagos de otros meses y la
 * fila de TOTALES no cuadraría con lo recaudado en el período.
 *
 * Las órdenes sin abonos no producen filas: la hoja lista movimientos de dinero
 * reales, así que su total coincide exactamente con lo recaudado.
 */
export const explodeOrderPayments = (
  order: Order,
  ctx: ExportContext,
): OrderPaymentRow[] => {
  const payments = order.payments ?? [];

  const inRange =
    ctx.dateField === 'payment'
      ? payments.filter((payment) => {
          const date = new Date(payment.paymentDate);
          return date >= ctx.from && date <= ctx.to;
        })
      : payments;

  // El backend los devuelve del más reciente al más antiguo; para conciliar se
  // leen en orden cronológico.
  return [...inRange]
    .sort(
      (a, b) =>
        new Date(a.paymentDate).getTime() - new Date(b.paymentDate).getTime(),
    )
    .map((payment) => ({ order, payment }));
};

/**
 * Nombre de quien registró el abono. Cae al email cuando el usuario no tiene
 * nombres cargados: dejar la celda vacía haría inútil justamente la columna que
 * responde quién cargó qué.
 */
const formatReceivedBy = ({ receivedBy }: Payment): string => {
  if (!receivedBy) return '';
  const fullName = [receivedBy.firstName, receivedBy.lastName]
    .filter(Boolean)
    .join(' ')
    .trim();
  return fullName || receivedBy.email;
};

export const ORDER_PAYMENT_EXPORT_COLUMNS: ExportColumn<OrderPaymentRow>[] = [
  {
    key: 'orderNumber',
    label: 'Nº Orden',
    defaultVisible: true,
    getValue: ({ order }) => order.orderNumber,
  },
  {
    key: 'client',
    label: 'Cliente',
    defaultVisible: true,
    getValue: ({ order }) => order.client?.name ?? '',
  },
  {
    key: 'clientDocument',
    label: 'NIT / Cédula',
    defaultVisible: true,
    getValue: ({ order }) => order.client?.nit ?? order.client?.cedula ?? '',
  },
  {
    key: 'paymentDate',
    label: 'Fecha de Pago',
    defaultVisible: true,
    getValue: ({ payment }) => formatDate(payment.paymentDate),
  },
  {
    // Única columna numérica: TOTALES suma el recaudo del rango sin duplicar
    // nada, porque cada fila es un abono distinto.
    key: 'amount',
    label: 'Monto',
    defaultVisible: true,
    numeric: true,
    getValue: ({ payment }) => {
      const amount = parseFloat(payment.amount ?? '');
      return Number.isFinite(amount) ? amount : 0;
    },
  },
  {
    key: 'paymentMethod',
    label: 'Método',
    defaultVisible: true,
    // El tipo del frontend no cubre CHECK ni OTHER, que sí existen en Prisma:
    // se cae al valor crudo antes que dejar la celda en "undefined".
    getValue: ({ payment }) =>
      PAYMENT_METHOD_LABELS[payment.paymentMethod] ?? payment.paymentMethod,
  },
  {
    // Es la columna que desempata: dos abonos del mismo monto el mismo día son
    // indistinguibles por fecha + valor, y el comprobante es lo único que los
    // amarra a un movimiento concreto del extracto.
    key: 'reference',
    label: 'Referencia / Comprobante',
    defaultVisible: true,
    getValue: ({ payment }) => payment.reference ?? '',
  },
  {
    key: 'bankEntity',
    label: 'Entidad Bancaria',
    defaultVisible: true,
    // Solo se diligencia en transferencias; en efectivo queda vacío a propósito.
    getValue: ({ payment }) => payment.bankEntity ?? '',
  },
  {
    // Responde "qué abonos cargó cada comercial", que es el motivo del reporte.
    key: 'receivedBy',
    label: 'Registrado por',
    defaultVisible: true,
    getValue: ({ payment }) => formatReceivedBy(payment),
  },
  {
    // La columna que explica por qué un abono no aparece en el historial de
    // caja: si no había sesión abierta al registrarlo, el pago quedó sin
    // movimiento y nada lo reprocesa después. Filtrar por "No" en Excel aísla
    // justamente los abonos que no cuadran contra el extracto.
    //
    // El saldo a favor se reporta aparte ("No aplica"): tampoco genera
    // movimiento, pero eso es correcto — ese dinero ya entró a caja cuando el
    // cliente sobrepagó la orden de origen. Mezclarlo con los huérfanos
    // ensuciaría el filtro con falsos positivos.
    key: 'inCashRegister',
    label: '¿En Caja?',
    defaultVisible: true,
    getValue: ({ payment }) => {
      if (payment.paymentMethod === 'CREDIT_BALANCE') return 'No aplica';
      if (!payment.cashMovement) return 'No';
      return payment.cashMovement.isVoided ? 'Anulado' : 'Sí';
    },
  },
  {
    // Permite cruzar la fila directamente contra el historial de caja.
    key: 'cashReceiptNumber',
    label: 'Recibo Caja',
    defaultVisible: true,
    getValue: ({ payment }) => payment.cashMovement?.receiptNumber ?? '',
  },
  {
    // El texto es corto a propósito: la URL prefirmada tiene cientos de
    // caracteres y va en el hipervínculo, no en la celda.
    key: 'receipt',
    label: 'Soporte',
    defaultVisible: true,
    getValue: ({ payment }) => {
      if (!payment.receiptFileId) return 'Sin soporte';
      // El id existe pero no se pudo firmar la URL (archivo borrado del bucket).
      return payment.receiptUrl ? 'Ver soporte' : 'No disponible';
    },
    hyperlink: ({ payment }) => payment.receiptUrl,
  },
  {
    key: 'notes',
    label: 'Notas',
    defaultVisible: true,
    getValue: ({ payment }) => payment.notes ?? '',
  },
];
