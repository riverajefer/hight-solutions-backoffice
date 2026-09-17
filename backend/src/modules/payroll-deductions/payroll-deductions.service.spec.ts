import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { PayrollDeductionsService } from './payroll-deductions.service';
import { PrismaService } from '../../database/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import {
  EmployeeStatus,
  OrderStatus,
  PaymentMethod,
  PayrollDeductionStatus,
  PayrollPeriodStatus,
  Prisma,
} from '../../generated/prisma';

/**
 * Lo que se protege acá es que la empresa no dé por cobrado dinero que todavía
 * no ha recuperado, y que el empleado no termine pagando dos veces el mismo
 * trabajo —ni pagando uno que se anuló.
 */
describe('PayrollDeductionsService', () => {
  let service: PayrollDeductionsService;
  let prisma: any;
  let notifications: jest.Mocked<NotificationsService>;

  const EMPLOYEE_ID = 'emp-1';
  const ORDER_ID = 'order-1';
  const PERIOD_ID = 'period-1';
  const ITEM_ID = 'item-1';

  const approvedDeduction = (overrides: Record<string, unknown> = {}) => ({
    id: 'ded-1',
    orderId: ORDER_ID,
    employeeId: EMPLOYEE_ID,
    payrollItemId: null,
    paymentId: null,
    amount: new Prisma.Decimal(250_000),
    status: PayrollDeductionStatus.APPROVED,
    order: {
      id: ORDER_ID,
      orderNumber: 'OP-001',
      status: OrderStatus.CONFIRMED,
      client: { id: 'cli-1', name: 'Juan Pérez' },
    },
    payrollItem: null,
    requestedBy: { firstName: 'Ana', lastName: 'Gómez' },
    ...overrides,
  });

  const payrollItem = (overrides: Record<string, unknown> = {}) => ({
    id: ITEM_ID,
    periodId: PERIOD_ID,
    employeeId: EMPLOYEE_ID,
    baseSalary: new Prisma.Decimal(1_300_000),
    transportAllowance: new Prisma.Decimal(200_000),
    orderDeductions: null,
    totalPayment: new Prisma.Decimal(1_500_000),
    extraShifts: [],
    ...overrides,
  });

  /** El P2002 tal como lo entrega el adaptador PrismaPg: sin `meta.target`. */
  const uniqueViolation = (constraint: string) =>
    Object.assign(new Error('Unique constraint failed'), {
      code: 'P2002',
      meta: { driverAdapterError: { cause: { constraint: { fields: [constraint] } } } },
    });

  beforeEach(async () => {
    const tx = {
      // `lockOrderForUpdate` bloquea la OP con SQL crudo.
      $queryRaw: jest.fn(),
      payment: { create: jest.fn(), update: jest.fn() },
      payrollItem: { update: jest.fn(), findUnique: jest.fn() },
      payrollDeduction: {
        update: jest.fn(),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        findUnique: jest.fn(),
        findUniqueOrThrow: jest.fn(),
      },
      order: { findUnique: jest.fn(), update: jest.fn() },
    };

    prisma = {
      client: { findUnique: jest.fn() },
      payrollDeduction: {
        findUnique: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
        create: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        count: jest.fn().mockResolvedValue(0),
      },
      payrollPeriod: { findUnique: jest.fn() },
      payrollItem: { findUnique: jest.fn() },
      payment: { create: jest.fn() },
      order: { findUnique: jest.fn(), update: jest.fn() },
      $transaction: jest.fn(async (cb: any) => cb(tx)),
      __tx: tx,
    };

    notifications = {
      notifyUsersWithPermission: jest.fn().mockResolvedValue(undefined),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PayrollDeductionsService,
        { provide: PrismaService, useValue: prisma },
        { provide: NotificationsService, useValue: notifications },
      ],
    }).compile();

    service = module.get(PayrollDeductionsService);
  });

  // ─── Vínculo cliente ↔ empleado ─────────────────────────────────────────

  describe('assertClientIsEmployee', () => {
    it('devuelve la ficha cuando el cliente es un empleado activo', async () => {
      prisma.client.findUnique.mockResolvedValue({
        id: 'cli-1',
        name: 'Juan Pérez',
        employee: { id: EMPLOYEE_ID, status: EmployeeStatus.ACTIVE },
      });

      await expect(service.assertClientIsEmployee('cli-1')).resolves.toEqual({
        id: EMPLOYEE_ID,
        status: EmployeeStatus.ACTIVE,
      });
    });

    // Sin ficha de nómina no hay a quién descontarle: dejarlo pasar crearía una
    // OP marcada como "descuento por nómina" que nadie puede cobrar nunca.
    it('rechaza a un cliente que no está vinculado a nómina', async () => {
      prisma.client.findUnique.mockResolvedValue({
        id: 'cli-2',
        name: 'Ferretería El Tornillo',
        employee: null,
      });

      await expect(service.assertClientIsEmployee('cli-2')).rejects.toThrow(
        BadRequestException,
      );
    });

    // Un empleado retirado ya no tiene quincena de dónde restar.
    it('rechaza a un empleado que no está activo', async () => {
      prisma.client.findUnique.mockResolvedValue({
        id: 'cli-3',
        name: 'Pedro Ruiz',
        employee: { id: 'emp-9', status: EmployeeStatus.INACTIVE },
      });

      await expect(service.assertClientIsEmployee('cli-3')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('falla si el cliente no existe', async () => {
      prisma.client.findUnique.mockResolvedValue(null);

      await expect(service.assertClientIsEmployee('nope')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ─── Aprobación ─────────────────────────────────────────────────────────

  describe('approve / reject', () => {
    const pending = (overrides: Record<string, unknown> = {}) =>
      approvedDeduction({ status: PayrollDeductionStatus.PENDING, ...overrides });

    it('aprueba solo si el descuento sigue pendiente', async () => {
      prisma.payrollDeduction.findUnique.mockResolvedValue(pending());

      await service.approve('ded-1', 'admin-1');

      expect(prisma.payrollDeduction.updateMany).toHaveBeenCalledWith({
        where: { id: 'ded-1', status: { in: [PayrollDeductionStatus.PENDING] } },
        data: expect.objectContaining({
          status: PayrollDeductionStatus.APPROVED,
          approvedById: 'admin-1',
        }),
      });
      expect(notifications.notifyUsersWithPermission).toHaveBeenCalled();
    });

    // Aprobar y cancelar a la vez: sin la condición, la aprobación pisaba la
    // cancelación y el descuento volvía a la bandeja de nómina.
    it('responde conflicto si otra petición cambió el estado entre la lectura y la escritura', async () => {
      prisma.payrollDeduction.findUnique
        .mockResolvedValueOnce(pending())
        .mockResolvedValueOnce({ status: PayrollDeductionStatus.CANCELLED });
      prisma.payrollDeduction.updateMany.mockResolvedValue({ count: 0 });

      await expect(service.approve('ded-1', 'admin-1')).rejects.toThrow(
        ConflictException,
      );
      expect(notifications.notifyUsersWithPermission).not.toHaveBeenCalled();
    });

    it('no aprueba el descuento de una OP anulada', async () => {
      prisma.payrollDeduction.findUnique.mockResolvedValue(
        pending({
          order: {
            id: ORDER_ID,
            orderNumber: 'OP-001',
            status: OrderStatus.ANULADO,
            client: { id: 'cli-1', name: 'Juan Pérez' },
          },
        }),
      );

      await expect(service.approve('ded-1', 'admin-1')).rejects.toThrow(/anulada/);
      expect(prisma.payrollDeduction.updateMany).not.toHaveBeenCalled();
    });

    it('rechaza solo si el descuento sigue pendiente', async () => {
      prisma.payrollDeduction.findUnique.mockResolvedValue(pending());

      await service.reject('ded-1', 'admin-1', { rejectionReason: 'No autorizado' });

      expect(prisma.payrollDeduction.updateMany).toHaveBeenCalledWith({
        where: { id: 'ded-1', status: { in: [PayrollDeductionStatus.PENDING] } },
        data: expect.objectContaining({
          status: PayrollDeductionStatus.REJECTED,
          rejectionReason: 'No autorizado',
        }),
      });
    });
  });

  // ─── Aplicación sobre la nómina ─────────────────────────────────────────

  describe('apply', () => {
    /**
     * Simula el incremento atómico de la base: la primera actualización del
     * registro suma al valor que ya tenía y devuelve la fila resultante.
     */
    const itemWithDeductionsBefore = (before: number) => {
      prisma.__tx.payrollItem.update.mockImplementation(async ({ data }: any) =>
        data.orderDeductions?.increment
          ? payrollItem({
              orderDeductions: new Prisma.Decimal(before).add(data.orderDeductions.increment),
            })
          : {},
      );
    };

    const setupApplicable = () => {
      prisma.payrollDeduction.findUnique.mockResolvedValue(approvedDeduction());
      prisma.payrollPeriod.findUnique.mockResolvedValue({
        id: PERIOD_ID,
        name: 'Quincena 1 de octubre',
        status: PayrollPeriodStatus.IN_PROGRESS,
      });
      prisma.payrollItem.findUnique.mockResolvedValue({ id: ITEM_ID });
      itemWithDeductionsBefore(0);
      prisma.__tx.payment.create.mockResolvedValue({ id: 'pay-1' });
      prisma.__tx.payrollDeduction.update.mockResolvedValue({ id: 'ded-1' });
      prisma.__tx.order.findUnique.mockResolvedValue({
        total: new Prisma.Decimal(250_000),
        refundedAmount: new Prisma.Decimal(0),
        reversedAmount: new Prisma.Decimal(0),
        appliedCreditAmount: new Prisma.Decimal(0),
        payments: [{ amount: new Prisma.Decimal(250_000), isVoided: false }],
      });
    };

    it('genera el abono con el monto real y sin movimiento de caja', async () => {
      setupApplicable();

      await service.apply('ded-1', 'user-1', { periodId: PERIOD_ID });

      const payment = prisma.__tx.payment.create.mock.calls[0][0].data;
      expect(payment.amount).toEqual(new Prisma.Decimal(250_000));
      expect(payment.paymentMethod).toBe(PaymentMethod.PAYROLL_DEDUCTION);
      // Lo esencial: ni movimiento de caja ni cola de arqueo. El dinero no entra
      // por la ventanilla, se deja de pagar.
      expect(payment.cashMovement).toBeUndefined();
      expect(payment.pendingCashEntry).toBe(false);
    });

    it('reclama el descuento antes de tocar la nómina', async () => {
      setupApplicable();

      await service.apply('ded-1', 'user-1', { periodId: PERIOD_ID });

      expect(prisma.__tx.payrollDeduction.updateMany).toHaveBeenCalledWith({
        where: { id: 'ded-1', status: { in: [PayrollDeductionStatus.APPROVED] } },
        data: expect.objectContaining({
          status: PayrollDeductionStatus.APPLIED,
          payrollItemId: ITEM_ID,
        }),
      });
      const claimOrder = prisma.__tx.payrollDeduction.updateMany.mock.invocationCallOrder[0];
      const itemOrder = prisma.__tx.payrollItem.update.mock.invocationCallOrder[0];
      expect(claimOrder).toBeLessThan(itemOrder);
    });

    it('suma a la nómina con un incremento atómico y actualiza el total', async () => {
      setupApplicable();

      await service.apply('ded-1', 'user-1', { periodId: PERIOD_ID });

      // Leer, sumar en memoria y escribir dejaba que dos descuentos del mismo
      // empleado se pisaran. La suma tiene que hacerla la base.
      const [increment, total] = prisma.__tx.payrollItem.update.mock.calls.map(
        (call: any[]) => call[0].data,
      );
      expect(increment).toEqual({
        orderDeductions: { increment: new Prisma.Decimal(250_000) },
      });
      // 1.300.000 + 200.000 - 250.000
      expect(total.totalPayment.toNumber()).toBe(1_250_000);
    });

    it('acumula sobre un descuento que el empleado ya tenía en el periodo', async () => {
      setupApplicable();
      itemWithDeductionsBefore(100_000);

      await service.apply('ded-1', 'user-1', { periodId: PERIOD_ID });

      const total = prisma.__tx.payrollItem.update.mock.calls[1][0].data;
      // 1.300.000 + 200.000 - (100.000 + 250.000)
      expect(total.totalPayment.toNumber()).toBe(1_150_000);
    });

    it('deja la orden saldada', async () => {
      setupApplicable();

      await service.apply('ded-1', 'user-1', { periodId: PERIOD_ID });

      const update = prisma.__tx.order.update.mock.calls[0][0].data;
      expect(update.paidAmount.toNumber()).toBe(250_000);
      expect(update.balance.toNumber()).toBe(0);
    });

    // Es la defensa contra el doble clic: el segundo devuelve el estado en vez
    // de descontarle al empleado dos veces por el mismo trabajo.
    it('es idempotente: un descuento ya aplicado no vuelve a descontar', async () => {
      const applied = approvedDeduction({
        status: PayrollDeductionStatus.APPLIED,
        paymentId: 'pay-1',
      });
      prisma.payrollDeduction.findUnique.mockResolvedValue(applied);

      const result = await service.apply('ded-1', 'user-1', {
        periodId: PERIOD_ID,
      });

      expect(result).toBe(applied);
      expect(prisma.$transaction).not.toHaveBeenCalled();
      expect(prisma.__tx.payment.create).not.toHaveBeenCalled();
    });

    // Dos aplicaciones simultáneas: las dos leen APPROVED. El índice único de
    // `payment_id` no las frenaba porque cada una crea su propio pago.
    it('si otra aplicación ganó la carrera, devuelve su resultado sin descontar de nuevo', async () => {
      setupApplicable();
      const applied = approvedDeduction({ status: PayrollDeductionStatus.APPLIED });
      prisma.payrollDeduction.findUnique
        .mockResolvedValueOnce(approvedDeduction())
        .mockResolvedValue(applied);
      prisma.__tx.payrollDeduction.updateMany.mockResolvedValue({ count: 0 });
      prisma.__tx.payrollDeduction.findUnique.mockResolvedValue({
        status: PayrollDeductionStatus.APPLIED,
      });

      const result = await service.apply('ded-1', 'user-1', { periodId: PERIOD_ID });

      expect(result).toBe(applied);
      expect(prisma.__tx.payrollItem.update).not.toHaveBeenCalled();
      expect(prisma.__tx.payment.create).not.toHaveBeenCalled();
    });

    // Antes llegaba como 500: el catch solo reconocía `payment_id`.
    it('una colisión de la llave de idempotencia devuelve el descuento ya aplicado', async () => {
      setupApplicable();
      const applied = approvedDeduction({ status: PayrollDeductionStatus.APPLIED });
      prisma.payrollDeduction.findUnique
        .mockResolvedValueOnce(approvedDeduction())
        .mockResolvedValue(applied);
      prisma.__tx.payment.create.mockRejectedValue(
        uniqueViolation('payments_idempotency_key_key'),
      );

      await expect(
        service.apply('ded-1', 'user-1', {
          periodId: PERIOD_ID,
          idempotencyKey: `deduction-ded-1-${PERIOD_ID}`,
        }),
      ).resolves.toBe(applied);
    });

    it('rechaza aplicar el descuento de una OP anulada', async () => {
      prisma.payrollDeduction.findUnique.mockResolvedValue(
        approvedDeduction({
          order: {
            id: ORDER_ID,
            orderNumber: 'OP-001',
            status: OrderStatus.ANULADO,
            client: { id: 'cli-1', name: 'Juan Pérez' },
          },
        }),
      );

      await expect(
        service.apply('ded-1', 'user-1', { periodId: PERIOD_ID }),
      ).rejects.toThrow(/anulada/);
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    // Un periodo pagado ya se le entregó al empleado: escribirle un descuento
    // encima cambia una colilla que él ya recibió.
    it('rechaza aplicar sobre un periodo ya pagado', async () => {
      prisma.payrollDeduction.findUnique.mockResolvedValue(approvedDeduction());
      prisma.payrollPeriod.findUnique.mockResolvedValue({
        id: PERIOD_ID,
        name: 'Quincena pasada',
        status: PayrollPeriodStatus.PAID,
      });

      await expect(
        service.apply('ded-1', 'user-1', { periodId: PERIOD_ID }),
      ).rejects.toThrow(/ya está pagado/);
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('rechaza aplicar un descuento que no está aprobado', async () => {
      prisma.payrollDeduction.findUnique.mockResolvedValue(
        approvedDeduction({ status: PayrollDeductionStatus.PENDING }),
      );

      await expect(
        service.apply('ded-1', 'user-1', { periodId: PERIOD_ID }),
      ).rejects.toThrow(BadRequestException);
    });

    it('exige que el empleado tenga registro en el periodo', async () => {
      prisma.payrollDeduction.findUnique.mockResolvedValue(approvedDeduction());
      prisma.payrollPeriod.findUnique.mockResolvedValue({
        id: PERIOD_ID,
        name: 'Quincena 1',
        status: PayrollPeriodStatus.IN_PROGRESS,
      });
      prisma.payrollItem.findUnique.mockResolvedValue(null);

      await expect(
        service.apply('ded-1', 'user-1', { periodId: PERIOD_ID }),
      ).rejects.toThrow(/no tiene registro/);
    });
  });

  // ─── Cancelación ────────────────────────────────────────────────────────

  describe('cancel', () => {
    const appliedIn = (periodStatus: PayrollPeriodStatus) =>
      approvedDeduction({
        status: PayrollDeductionStatus.APPLIED,
        payrollItemId: ITEM_ID,
        paymentId: 'pay-1',
        payrollItem: {
          id: ITEM_ID,
          periodId: PERIOD_ID,
          period: { id: PERIOD_ID, name: 'Quincena 1', status: periodStatus },
        },
      });

    it('antes de aplicarse solo cambia el estado, sin tocar la nómina', async () => {
      prisma.payrollDeduction.findUnique.mockResolvedValue(approvedDeduction());

      await service.cancel('ded-1', 'user-1', { cancelReason: 'Se anuló la OP' });

      expect(prisma.payrollDeduction.updateMany).toHaveBeenCalledWith({
        where: {
          id: 'ded-1',
          status: {
            in: [PayrollDeductionStatus.PENDING, PayrollDeductionStatus.APPROVED],
          },
        },
        data: expect.objectContaining({ status: PayrollDeductionStatus.CANCELLED }),
      });
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('si ya se aplicó, devuelve el valor a la nómina y anula el abono', async () => {
      prisma.payrollDeduction.findUnique.mockResolvedValue(
        appliedIn(PayrollPeriodStatus.IN_PROGRESS),
      );
      // El decremento lo hace la base: devuelve el registro ya sin el descuento.
      prisma.__tx.payrollItem.update
        .mockResolvedValueOnce(payrollItem({ orderDeductions: new Prisma.Decimal(0) }))
        .mockResolvedValueOnce({});
      prisma.__tx.payrollDeduction.findUniqueOrThrow.mockResolvedValue({ id: 'ded-1' });
      prisma.__tx.order.findUnique.mockResolvedValue({
        total: new Prisma.Decimal(250_000),
        refundedAmount: new Prisma.Decimal(0),
        reversedAmount: new Prisma.Decimal(0),
        appliedCreditAmount: new Prisma.Decimal(0),
        payments: [],
      });

      await service.cancel('ded-1', 'user-1', {
        cancelReason: 'Devolución por calidad',
      });

      const [decrement, restored] = prisma.__tx.payrollItem.update.mock.calls.map(
        (call: any[]) => call[0].data,
      );
      expect(decrement).toEqual({
        orderDeductions: { decrement: new Prisma.Decimal(250_000) },
      });
      expect(restored.orderDeductions.toNumber()).toBe(0);
      expect(restored.totalPayment.toNumber()).toBe(1_500_000);

      // El pago no se borra: se anula, para que el historial siga contando qué
      // pasó y quién lo deshizo.
      const paymentUpdate = prisma.__tx.payment.update.mock.calls[0][0].data;
      expect(paymentUpdate.isVoided).toBe(true);
      expect(paymentUpdate.voidReason).toContain('Devolución por calidad');

      // Y la orden vuelve a deber.
      const orderUpdate = prisma.__tx.order.update.mock.calls[0][0].data;
      expect(orderUpdate.balance.toNumber()).toBe(250_000);
    });

    // Dos cancelaciones simultáneas devolverían el valor a la nómina dos veces.
    it('si otra cancelación ganó la carrera, no devuelve el valor dos veces', async () => {
      prisma.payrollDeduction.findUnique.mockResolvedValue(
        appliedIn(PayrollPeriodStatus.IN_PROGRESS),
      );
      prisma.__tx.payrollDeduction.updateMany.mockResolvedValue({ count: 0 });
      prisma.__tx.payrollDeduction.findUnique.mockResolvedValue({
        status: PayrollDeductionStatus.CANCELLED,
      });

      await expect(
        service.cancel('ded-1', 'user-1', { cancelReason: 'Reclamo' }),
      ).rejects.toThrow(ConflictException);
      expect(prisma.__tx.payrollItem.update).not.toHaveBeenCalled();
      expect(prisma.__tx.payment.update).not.toHaveBeenCalled();
    });

    // Cambiar una colilla ya entregada descuadra lo que se giró.
    it('rechaza cancelar un descuento aplicado en un periodo ya pagado', async () => {
      prisma.payrollDeduction.findUnique.mockResolvedValue(
        appliedIn(PayrollPeriodStatus.PAID),
      );

      await expect(
        service.cancel('ded-1', 'user-1', { cancelReason: 'Reclamo' }),
      ).rejects.toThrow(/está pagado/);
    });
  });

  // ─── Ciclo de vida de la OP ─────────────────────────────────────────────

  describe('ciclo de vida de la OP', () => {
    describe('assertOrderCanBeAnnulled', () => {
      // Al empleado ya se le restó el valor: anular sin cancelar dejaría ese
      // dinero descontado por un trabajo que ya no existe.
      it('bloquea anular una OP con el descuento ya aplicado', async () => {
        prisma.payrollDeduction.findUnique.mockResolvedValue({
          status: PayrollDeductionStatus.APPLIED,
        });

        await expect(service.assertOrderCanBeAnnulled(ORDER_ID)).rejects.toThrow(
          /Cancélalo/,
        );
      });

      it.each([PayrollDeductionStatus.PENDING, PayrollDeductionStatus.APPROVED])(
        'deja anular con el descuento %s',
        async (status) => {
          prisma.payrollDeduction.findUnique.mockResolvedValue({ status });

          await expect(service.assertOrderCanBeAnnulled(ORDER_ID)).resolves.toBeUndefined();
        },
      );

      it('deja anular una OP sin descuento', async () => {
        prisma.payrollDeduction.findUnique.mockResolvedValue(null);

        await expect(service.assertOrderCanBeAnnulled(ORDER_ID)).resolves.toBeUndefined();
      });
    });

    it('cancelForAnnulledOrder cancela solo el descuento sin aplicar', async () => {
      await service.cancelForAnnulledOrder(ORDER_ID, 'OP-001');

      expect(prisma.payrollDeduction.updateMany).toHaveBeenCalledWith({
        where: {
          orderId: ORDER_ID,
          status: {
            in: [PayrollDeductionStatus.PENDING, PayrollDeductionStatus.APPROVED],
          },
        },
        data: expect.objectContaining({
          status: PayrollDeductionStatus.CANCELLED,
          cancelReason: 'La orden OP-001 se anuló',
        }),
      });
    });

    describe('assertOrderValueMatches', () => {
      const withDeduction = (status: PayrollDeductionStatus, amount = 250_000) =>
        prisma.__tx.payrollDeduction.findUnique.mockResolvedValue({
          status,
          amount: new Prisma.Decimal(amount),
        });

      it('deja pasar un cambio que no mueve el total', async () => {
        withDeduction(PayrollDeductionStatus.APPROVED);

        await expect(
          service.assertOrderValueMatches(prisma.__tx, ORDER_ID, new Prisma.Decimal(250_000)),
        ).resolves.toBeUndefined();
      });

      it.each([
        PayrollDeductionStatus.PENDING,
        PayrollDeductionStatus.APPROVED,
        PayrollDeductionStatus.APPLIED,
      ])('bloquea cambiar el total con el descuento %s', async (status) => {
        withDeduction(status);

        await expect(
          service.assertOrderValueMatches(prisma.__tx, ORDER_ID, new Prisma.Decimal(180_000)),
        ).rejects.toThrow(/Cancela el descuento/);
      });

      it.each([PayrollDeductionStatus.REJECTED, PayrollDeductionStatus.CANCELLED])(
        'ignora un descuento %s',
        async (status) => {
          withDeduction(status);

          await expect(
            service.assertOrderValueMatches(prisma.__tx, ORDER_ID, new Prisma.Decimal(180_000)),
          ).resolves.toBeUndefined();
        },
      );

      it('ignora una OP sin descuento', async () => {
        prisma.__tx.payrollDeduction.findUnique.mockResolvedValue(null);

        await expect(
          service.assertOrderValueMatches(prisma.__tx, ORDER_ID, new Prisma.Decimal(1)),
        ).resolves.toBeUndefined();
      });
    });

    describe('assertNoLiveDeduction', () => {
      it('bloquea con un descuento vivo', async () => {
        prisma.payrollDeduction.findUnique.mockResolvedValue({
          status: PayrollDeductionStatus.APPROVED,
        });

        await expect(
          service.assertNoLiveDeduction(ORDER_ID, 'cambiar las tasas'),
        ).rejects.toThrow(/No se puede cambiar las tasas/);
      });

      it('deja pasar con un descuento rechazado', async () => {
        prisma.payrollDeduction.findUnique.mockResolvedValue({
          status: PayrollDeductionStatus.REJECTED,
        });

        await expect(
          service.assertNoLiveDeduction(ORDER_ID, 'cambiar las tasas'),
        ).resolves.toBeUndefined();
      });
    });
  });
});
