import { describe, expect, it } from 'vitest';
import type { Order, Payment } from '../../../types/order.types';
import type { ExportContext } from '../../../utils/excelExport';
import {
  ORDER_PAYMENT_EXPORT_COLUMNS,
  explodeOrderPayments,
  type OrderPaymentRow,
} from './orderPaymentExportColumns';

const makePayment = (overrides: Partial<Payment> = {}): Payment =>
  ({
    id: 'pay-1',
    amount: '100000',
    paymentMethod: 'TRANSFER',
    paymentDate: '2026-07-15T10:00:00.000Z',
    reference: null,
    notes: null,
    bankEntity: null,
    receiptFileId: null,
    createdAt: '2026-07-15T10:00:00.000Z',
    receivedBy: {
      id: 'user-1',
      email: 'caja@example.com',
      firstName: 'Caja',
      lastName: 'Uno',
    },
    cashMovement: null,
    ...overrides,
  }) as Payment;

const makeOrder = (payments: Payment[]): Order =>
  ({
    orderNumber: 'OP-0001',
    client: { id: 'c-1', name: 'Cliente Demo', nit: '900123456', cedula: null },
    payments,
  }) as unknown as Order;

/** Contexto equivalente a "exportar por fecha de orden" (sin recorte de abonos). */
const byOrderDate: ExportContext = {
  from: new Date('2026-01-01T00:00:00.000Z'),
  to: new Date('2026-12-31T23:59:59.999Z'),
  dateField: 'order',
};

const column = (key: string) => {
  const col = ORDER_PAYMENT_EXPORT_COLUMNS.find((c) => c.key === key);
  if (!col) throw new Error(`Columna ${key} no encontrada`);
  return col;
};

const valueOf = (key: string, row: OrderPaymentRow) => column(key).getValue(row);

describe('explodeOrderPayments', () => {
  it('genera una fila por cada abono de la orden', () => {
    const order = makeOrder([
      makePayment({ id: 'p1', paymentDate: '2026-07-01T10:00:00.000Z' }),
      makePayment({ id: 'p2', paymentDate: '2026-07-10T10:00:00.000Z' }),
      makePayment({ id: 'p3', paymentDate: '2026-07-20T10:00:00.000Z' }),
    ]);

    const rows = explodeOrderPayments(order, byOrderDate);

    expect(rows).toHaveLength(3);
    expect(rows.every((r) => r.order === order)).toBe(true);
  });

  it('omite las órdenes sin abonos para que TOTALES cuadre con lo recaudado', () => {
    expect(explodeOrderPayments(makeOrder([]), byOrderDate)).toEqual([]);
    expect(
      explodeOrderPayments({ ...makeOrder([]), payments: undefined } as unknown as Order, byOrderDate),
    ).toEqual([]);
  });

  it('ordena los abonos cronológicamente (el backend los devuelve al revés)', () => {
    const order = makeOrder([
      makePayment({ id: 'nuevo', paymentDate: '2026-07-20T10:00:00.000Z' }),
      makePayment({ id: 'viejo', paymentDate: '2026-07-01T10:00:00.000Z' }),
      makePayment({ id: 'medio', paymentDate: '2026-07-10T10:00:00.000Z' }),
    ]);

    const rows = explodeOrderPayments(order, byOrderDate);

    expect(rows.map((r) => r.payment.id)).toEqual(['viejo', 'medio', 'nuevo']);
  });

  it('descarta los abonos fuera del rango cuando se exporta por fecha de pago', () => {
    const order = makeOrder([
      makePayment({ id: 'junio', paymentDate: '2026-06-28T10:00:00.000Z' }),
      makePayment({ id: 'julio', paymentDate: '2026-07-15T10:00:00.000Z' }),
      makePayment({ id: 'agosto', paymentDate: '2026-08-03T10:00:00.000Z' }),
    ]);

    const rows = explodeOrderPayments(order, {
      from: new Date('2026-07-01T00:00:00.000Z'),
      to: new Date('2026-07-31T23:59:59.999Z'),
      dateField: 'payment',
    });

    expect(rows.map((r) => r.payment.id)).toEqual(['julio']);
  });

  it('no recorta abonos cuando el rango se aplica a la fecha de orden', () => {
    const order = makeOrder([
      makePayment({ id: 'dentro', paymentDate: '2026-07-15T10:00:00.000Z' }),
      makePayment({ id: 'fuera', paymentDate: '2027-02-01T10:00:00.000Z' }),
    ]);

    const rows = explodeOrderPayments(order, {
      from: new Date('2026-07-01T00:00:00.000Z'),
      to: new Date('2026-07-31T23:59:59.999Z'),
      dateField: 'order',
    });

    expect(rows).toHaveLength(2);
  });
});

describe('ORDER_PAYMENT_EXPORT_COLUMNS', () => {
  const row: OrderPaymentRow = {
    order: makeOrder([]),
    payment: makePayment({ amount: '250000.5', paymentMethod: 'TRANSFER' }),
  };

  it('exporta el monto como número, no como string', () => {
    const amount = valueOf('amount', row);
    expect(typeof amount).toBe('number');
    expect(amount).toBe(250000.5);
  });

  it('solo el monto es numérica, para no inflar la fila de TOTALES', () => {
    const numericKeys = ORDER_PAYMENT_EXPORT_COLUMNS.filter(
      (c) => c.numeric,
    ).map((c) => c.key);
    expect(numericKeys).toEqual(['amount']);
  });

  it('devuelve 0 si el monto viene vacío o corrupto', () => {
    const broken: OrderPaymentRow = {
      ...row,
      payment: makePayment({ amount: '' as unknown as string }),
    };
    expect(valueOf('amount', broken)).toBe(0);
  });

  it('traduce el método de pago y cae al valor crudo si no tiene etiqueta', () => {
    expect(valueOf('paymentMethod', row)).toBe('Transferencia');

    const check: OrderPaymentRow = {
      ...row,
      // CHECK existe en Prisma pero no en PAYMENT_METHOD_LABELS del frontend.
      payment: makePayment({
        paymentMethod: 'CHECK' as Payment['paymentMethod'],
      }),
    };
    expect(valueOf('paymentMethod', check)).toBe('CHECK');
  });

  it('usa el NIT y cae a la cédula cuando no hay NIT', () => {
    expect(valueOf('clientDocument', row)).toBe('900123456');

    const persona: OrderPaymentRow = {
      ...row,
      order: {
        ...row.order,
        client: { ...row.order.client, nit: null, cedula: '1020304050' },
      },
    };
    expect(valueOf('clientDocument', persona)).toBe('1020304050');
  });

  it('repite el Nº de orden en cada fila para poder cruzar con la hoja principal', () => {
    expect(valueOf('orderNumber', row)).toBe('OP-0001');
    expect(valueOf('client', row)).toBe('Cliente Demo');
  });

  it('trae referencia y entidad bancaria, que son las que identifican el movimiento', () => {
    const transferencia: OrderPaymentRow = {
      ...row,
      payment: makePayment({
        reference: 'TRF-998877',
        bankEntity: 'Bancolombia',
      }),
    };
    expect(valueOf('reference', transferencia)).toBe('TRF-998877');
    expect(valueOf('bankEntity', transferencia)).toBe('Bancolombia');
  });

  it('deja la celda vacía (no "null") cuando el abono no tiene esos datos', () => {
    const efectivo: OrderPaymentRow = {
      ...row,
      payment: makePayment({
        paymentMethod: 'CASH',
        reference: null,
        bankEntity: null,
      }),
    };
    expect(valueOf('reference', efectivo)).toBe('');
    expect(valueOf('bankEntity', efectivo)).toBe('');
  });

  it('desempata dos abonos iguales el mismo día por su referencia', () => {
    const order = makeOrder([
      makePayment({
        id: 'a',
        amount: '50000',
        paymentDate: '2026-07-22T09:00:00.000Z',
        reference: 'REC-001',
      }),
      makePayment({
        id: 'b',
        amount: '50000',
        paymentDate: '2026-07-22T09:00:00.000Z',
        reference: 'REC-002',
      }),
    ]);

    const refs = explodeOrderPayments(order, byOrderDate).map((r) =>
      valueOf('reference', r),
    );
    expect(refs).toEqual(['REC-001', 'REC-002']);
  });

  describe('columna «Registrado por»', () => {
    it('muestra el nombre completo de quien cargó el abono', () => {
      expect(valueOf('receivedBy', row)).toBe('Caja Uno');
    });

    it('cae al email cuando el usuario no tiene nombres cargados', () => {
      const sinNombre: OrderPaymentRow = {
        ...row,
        payment: makePayment({
          receivedBy: {
            id: 'user-2',
            email: 'comercial@example.com',
            firstName: null,
            lastName: null,
          },
        }),
      };
      expect(valueOf('receivedBy', sinNombre)).toBe('comercial@example.com');
    });

    it('no deja espacios sueltos cuando solo hay uno de los dos nombres', () => {
      const soloNombre: OrderPaymentRow = {
        ...row,
        payment: makePayment({
          receivedBy: {
            id: 'user-3',
            email: 'ana@example.com',
            firstName: 'Ana',
            lastName: null,
          },
        }),
      };
      expect(valueOf('receivedBy', soloNombre)).toBe('Ana');
    });
  });

  describe('columna «¿En Caja?»', () => {
    it('dice "No" cuando el abono nunca generó movimiento de caja', () => {
      // Es el caso que motiva el reporte: se registró sin sesión de caja
      // abierta, así que no aparece en el historial de caja.
      expect(valueOf('inCashRegister', row)).toBe('No');
      expect(valueOf('cashReceiptNumber', row)).toBe('');
    });

    it('dice "Sí" y expone el recibo cuando sí llegó a caja', () => {
      const enCaja: OrderPaymentRow = {
        ...row,
        payment: makePayment({
          cashMovement: { receiptNumber: 'RC-000123', isVoided: false },
        }),
      };
      expect(valueOf('inCashRegister', enCaja)).toBe('Sí');
      expect(valueOf('cashReceiptNumber', enCaja)).toBe('RC-000123');
    });

    it('reporta el saldo a favor como "No aplica", no como huérfano', () => {
      // No genera movimiento de caja por diseño: ese dinero ya entró cuando el
      // cliente sobrepagó la orden de origen. Contarlo como "No" metería falsos
      // positivos justo en el filtro que usa el cliente para conciliar.
      const saldoAFavor: OrderPaymentRow = {
        ...row,
        payment: makePayment({
          paymentMethod: 'CREDIT_BALANCE',
          cashMovement: null,
        }),
      };
      expect(valueOf('inCashRegister', saldoAFavor)).toBe('No aplica');
    });

    it('distingue el movimiento anulado de la ausencia de movimiento', () => {
      const anulado: OrderPaymentRow = {
        ...row,
        payment: makePayment({
          cashMovement: { receiptNumber: 'RC-000124', isVoided: true },
        }),
      };
      expect(valueOf('inCashRegister', anulado)).toBe('Anulado');
      expect(valueOf('cashReceiptNumber', anulado)).toBe('RC-000124');
    });
  });

  describe('columna «Soporte»', () => {
    const soporte = () => column('receipt');

    it('enlaza la URL prefirmada cuando el abono tiene comprobante', () => {
      const conSoporte: OrderPaymentRow = {
        ...row,
        payment: makePayment({
          receiptFileId: 'file-1',
          receiptUrl: 'https://s3.example.com/signed?sig=abc',
        }),
      };
      expect(valueOf('receipt', conSoporte)).toBe('Ver soporte');
      expect(soporte().hyperlink?.(conSoporte)).toBe(
        'https://s3.example.com/signed?sig=abc',
      );
    });

    it('no enlaza nada cuando el abono no tiene comprobante', () => {
      expect(valueOf('receipt', row)).toBe('Sin soporte');
      expect(soporte().hyperlink?.(row)).toBeUndefined();
    });

    it('avisa cuando hay comprobante pero no se pudo firmar la URL', () => {
      const sinFirmar: OrderPaymentRow = {
        ...row,
        payment: makePayment({ receiptFileId: 'file-borrado' }),
      };
      expect(valueOf('receipt', sinFirmar)).toBe('No disponible');
      expect(soporte().hyperlink?.(sinFirmar)).toBeUndefined();
    });
  });
});
