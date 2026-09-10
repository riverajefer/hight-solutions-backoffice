import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PayrollDeductionsService } from './payroll-deductions.service';
import { PrismaService } from '../../database/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import {
  EmployeeStatus,
  PaymentMethod,
  PayrollDeductionStatus,
  PayrollPeriodStatus,
  Prisma,
} from '../../generated/prisma';

/**
 * Lo que se protege acá es que la empresa no dé por cobrado dinero que todavía
 * no ha recuperado, y que el empleado no termine pagando dos veces el mismo
 * trabajo.
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

  beforeEach(async () => {
    const tx = {
      payment: { create: jest.fn(), update: jest.fn() },
      payrollItem: { update: jest.fn(), findUnique: jest.fn() },
      payrollDeduction: { update: jest.fn() },
      order: { findUnique: jest.fn(), update: jest.fn() },
    };

    prisma = {
      client: { findUnique: jest.fn() },
      payrollDeduction: {
        findUnique: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
        create: jest.fn(),
        update: jest.fn(),
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

  // ─── Aplicación sobre la nómina ─────────────────────────────────────────

  describe('apply', () => {
    const setupApplicable = () => {
      prisma.payrollDeduction.findUnique.mockResolvedValue(approvedDeduction());
      prisma.payrollPeriod.findUnique.mockResolvedValue({
        id: PERIOD_ID,
        name: 'Quincena 1 de octubre',
        status: PayrollPeriodStatus.IN_PROGRESS,
      });
      prisma.payrollItem.findUnique.mockResolvedValue(payrollItem());
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

    it('resta el valor del pago del empleado y actualiza su total', async () => {
      setupApplicable();

      await service.apply('ded-1', 'user-1', { periodId: PERIOD_ID });

      const update = prisma.__tx.payrollItem.update.mock.calls[0][0].data;
      expect(update.orderDeductions).toEqual(new Prisma.Decimal(250_000));
      // 1.300.000 + 200.000 - 250.000
      expect(update.totalPayment.toNumber()).toBe(1_250_000);
    });

    it('acumula sobre un descuento que el empleado ya tenía en el periodo', async () => {
      setupApplicable();
      prisma.payrollItem.findUnique.mockResolvedValue(
        payrollItem({ orderDeductions: new Prisma.Decimal(100_000) }),
      );

      await service.apply('ded-1', 'user-1', { periodId: PERIOD_ID });

      const update = prisma.__tx.payrollItem.update.mock.calls[0][0].data;
      expect(update.orderDeductions).toEqual(new Prisma.Decimal(350_000));
      expect(update.totalPayment.toNumber()).toBe(1_150_000);
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
    it('antes de aplicarse solo cambia el estado, sin tocar la nómina', async () => {
      prisma.payrollDeduction.findUnique.mockResolvedValue(approvedDeduction());
      prisma.payrollDeduction.update.mockResolvedValue({ id: 'ded-1' });

      await service.cancel('ded-1', 'user-1', { cancelReason: 'Se anuló la OP' });

      expect(prisma.payrollDeduction.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: PayrollDeductionStatus.CANCELLED,
          }),
        }),
      );
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('si ya se aplicó, devuelve el valor a la nómina y anula el abono', async () => {
      prisma.payrollDeduction.findUnique.mockResolvedValue(
        approvedDeduction({
          status: PayrollDeductionStatus.APPLIED,
          payrollItemId: ITEM_ID,
          paymentId: 'pay-1',
          payrollItem: {
            id: ITEM_ID,
            periodId: PERIOD_ID,
            period: {
              id: PERIOD_ID,
              name: 'Quincena 1',
              status: PayrollPeriodStatus.IN_PROGRESS,
            },
          },
        }),
      );
      prisma.__tx.payrollItem.findUnique.mockResolvedValue(
        payrollItem({ orderDeductions: new Prisma.Decimal(250_000) }),
      );
      prisma.__tx.payrollDeduction.update.mockResolvedValue({ id: 'ded-1' });
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

      const itemUpdate = prisma.__tx.payrollItem.update.mock.calls[0][0].data;
      expect(itemUpdate.orderDeductions.toNumber()).toBe(0);
      expect(itemUpdate.totalPayment.toNumber()).toBe(1_500_000);

      // El pago no se borra: se anula, para que el historial siga contando qué
      // pasó y quién lo deshizo.
      const paymentUpdate = prisma.__tx.payment.update.mock.calls[0][0].data;
      expect(paymentUpdate.isVoided).toBe(true);
      expect(paymentUpdate.voidReason).toContain('Devolución por calidad');

      // Y la orden vuelve a deber.
      const orderUpdate = prisma.__tx.order.update.mock.calls[0][0].data;
      expect(orderUpdate.balance.toNumber()).toBe(250_000);
    });

    // Cambiar una colilla ya entregada descuadra lo que se giró.
    it('rechaza cancelar un descuento aplicado en un periodo ya pagado', async () => {
      prisma.payrollDeduction.findUnique.mockResolvedValue(
        approvedDeduction({
          status: PayrollDeductionStatus.APPLIED,
          payrollItemId: ITEM_ID,
          paymentId: 'pay-1',
          payrollItem: {
            id: ITEM_ID,
            periodId: PERIOD_ID,
            period: {
              id: PERIOD_ID,
              name: 'Quincena pasada',
              status: PayrollPeriodStatus.PAID,
            },
          },
        }),
      );

      await expect(
        service.cancel('ded-1', 'user-1', { cancelReason: 'Reclamo' }),
      ).rejects.toThrow(/está pagado/);
    });
  });
});
