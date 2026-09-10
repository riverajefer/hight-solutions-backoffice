import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import {
  EmployeeStatus,
  NotificationType,
  PaymentMethod,
  PayrollDeductionStatus,
  PayrollPeriodStatus,
  Prisma,
} from '../../generated/prisma';
import {
  ACTIVE_PAYMENT_WHERE,
  computeNetPaidAmount,
  computeOrderBalance,
  sumActivePayments,
} from '../../common/utils/order-balance.util';
import { computePayrollTotal } from '../../common/utils/payroll-total.util';
import { isUniqueViolationOn } from '../../common/utils/unique-violation.util';
import {
  ApplyPayrollDeductionDto,
  CancelPayrollDeductionDto,
  FilterPayrollDeductionsDto,
  RejectPayrollDeductionDto,
} from './dto';

/** Estados desde los que todavía se puede cancelar sin tocar la nómina. */
const CANCELLABLE_BEFORE_APPLY: PayrollDeductionStatus[] = [
  PayrollDeductionStatus.PENDING,
  PayrollDeductionStatus.APPROVED,
];

const USER_SELECT = {
  id: true,
  firstName: true,
  lastName: true,
  email: true,
  username: true,
} as const;

const DEDUCTION_INCLUDE = {
  order: {
    select: {
      id: true,
      orderNumber: true,
      total: true,
      balance: true,
      status: true,
      client: { select: { id: true, name: true } },
    },
  },
  employee: {
    select: {
      id: true,
      firstName: true,
      firstLastName: true,
      status: true,
      user: { select: USER_SELECT },
    },
  },
  payrollItem: {
    select: {
      id: true,
      periodId: true,
      period: { select: { id: true, name: true, status: true } },
    },
  },
  requestedBy: { select: USER_SELECT },
  approvedBy: { select: USER_SELECT },
  appliedBy: { select: USER_SELECT },
} satisfies Prisma.PayrollDeductionInclude;

/**
 * Descuento del valor de una OP sobre la nómina de un empleado.
 *
 * El dinero nunca pasa por caja: la empresa recupera el trabajo pagándole menos
 * al empleado en su quincena. Por eso la OP nace con saldo pendiente (el pago
 * inicial es de $0, igual que el crédito) y solo se salda en `apply()`, cuando
 * el descuento ya está escrito sobre un `PayrollItem` real.
 */
@Injectable()
export class PayrollDeductionsService {
  private readonly logger = new Logger(PayrollDeductionsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  // ─── Creación (la llama orders.service al crear la OP) ────────────────────

  /**
   * Verifica que el cliente de la orden sea un empleado activo y devuelve su
   * ficha. Se llama ANTES de crear la OP: si el cliente no está vinculado a
   * nómina, el asesor tiene que elegir otro método de pago.
   */
  async assertClientIsEmployee(clientId: string) {
    const client = await this.prisma.client.findUnique({
      where: { id: clientId },
      select: {
        id: true,
        name: true,
        employee: { select: { id: true, status: true } },
      },
    });

    if (!client) {
      throw new NotFoundException(`Cliente con id ${clientId} no encontrado`);
    }

    if (!client.employee) {
      throw new BadRequestException(
        `"${client.name}" no está vinculado a una ficha de empleado, así que no ` +
          'se le puede descontar por nómina. Vincúlalo desde la ficha del ' +
          'cliente o cobra la orden por otro medio.',
      );
    }

    if (client.employee.status !== EmployeeStatus.ACTIVE) {
      throw new BadRequestException(
        `"${client.name}" no está activo en nómina, así que no hay de dónde ` +
          'descontarle. Cobra la orden por otro medio.',
      );
    }

    return client.employee;
  }

  /**
   * Registra la cuenta por cobrar al empleado. Se ejecuta dentro de la misma
   * transacción que crea la OP para que no pueda existir una orden marcada como
   * "descuento por nómina" sin su descuento.
   */
  async createFromOrder(
    tx: Prisma.TransactionClient,
    params: {
      orderId: string;
      employeeId: string;
      amount: Prisma.Decimal;
      requestedById: string;
      notes?: string | null;
    },
  ) {
    return tx.payrollDeduction.create({
      data: {
        orderId: params.orderId,
        employeeId: params.employeeId,
        // Se congela el valor de la orden al momento de pedirlo. Si la OP cambia
        // de valor después, el descuento hay que cancelarlo y volver a pedirlo:
        // aprobar un monto y descontar otro es justo lo que nadie puede auditar.
        amount: params.amount,
        status: PayrollDeductionStatus.PENDING,
        requestedById: params.requestedById,
        notes: params.notes ?? null,
      },
    });
  }

  /** Avisa a quien aprueba. Se llama fuera de la transacción de la OP. */
  async notifyCreated(deductionId: string) {
    const deduction = await this.prisma.payrollDeduction.findUnique({
      where: { id: deductionId },
      include: DEDUCTION_INCLUDE,
    });
    if (!deduction) return;

    const requester =
      [deduction.requestedBy.firstName, deduction.requestedBy.lastName]
        .filter(Boolean)
        .join(' ') ||
      deduction.requestedBy.username ||
      deduction.requestedBy.email ||
      'Un asesor';

    await this.notificationsService.notifyUsersWithPermission(
      'approve_payroll_deductions',
      {
        type: NotificationType.PAYROLL_DEDUCTION_PENDING,
        title: 'Nueva solicitud de descuento por nómina',
        message:
          `${requester} solicita descontar ${this.formatAmount(deduction.amount)} ` +
          `de la nómina de ${deduction.order.client.name} por la orden ` +
          `${deduction.order.orderNumber}`,
        relatedId: deduction.id,
        relatedType: 'PayrollDeduction',
      },
    );
  }

  // ─── Consultas ────────────────────────────────────────────────────────────

  async findAll(filters: FilterPayrollDeductionsDto) {
    const {
      status,
      employeeId,
      periodId,
      search,
      onlyPending,
      page = 1,
      limit = 25,
    } = filters;

    const where: Prisma.PayrollDeductionWhereInput = {};
    if (status) where.status = status;
    if (employeeId) where.employeeId = employeeId;
    if (periodId) where.payrollItem = { periodId };
    if (onlyPending) {
      where.status = { in: CANCELLABLE_BEFORE_APPLY };
    }
    if (search) {
      where.OR = [
        { order: { orderNumber: { contains: search, mode: 'insensitive' } } },
        { order: { client: { name: { contains: search, mode: 'insensitive' } } } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.payrollDeduction.findMany({
        where,
        include: DEDUCTION_INCLUDE,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.payrollDeduction.count({ where }),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string) {
    const deduction = await this.prisma.payrollDeduction.findUnique({
      where: { id },
      include: DEDUCTION_INCLUDE,
    });
    if (!deduction) {
      throw new NotFoundException(`Descuento con id ${id} no encontrado`);
    }
    return deduction;
  }

  /** Descuentos aprobados que todavía no se han aplicado a ningún periodo. */
  async findApprovedForEmployee(employeeId: string) {
    return this.prisma.payrollDeduction.findMany({
      where: { employeeId, status: PayrollDeductionStatus.APPROVED },
      include: DEDUCTION_INCLUDE,
      orderBy: { approvedAt: 'asc' },
    });
  }

  // ─── Aprobación ───────────────────────────────────────────────────────────

  async approve(id: string, reviewerId: string) {
    const deduction = await this.findOne(id);
    this.assertStatus(deduction.status, [PayrollDeductionStatus.PENDING]);

    const updated = await this.prisma.payrollDeduction.update({
      where: { id },
      data: {
        status: PayrollDeductionStatus.APPROVED,
        approvedById: reviewerId,
        approvedAt: new Date(),
        rejectionReason: null,
      },
      include: DEDUCTION_INCLUDE,
    });

    await this.notificationsService.notifyUsersWithPermission(
      'apply_payroll_deductions',
      {
        type: NotificationType.PAYROLL_DEDUCTION_APPROVED,
        title: 'Descuento por nómina aprobado',
        message:
          `Queda pendiente aplicar ${this.formatAmount(updated.amount)} a la ` +
          `nómina de ${updated.order.client.name} (orden ${updated.order.orderNumber})`,
        relatedId: updated.id,
        relatedType: 'PayrollDeduction',
      },
    );

    return updated;
  }

  async reject(id: string, reviewerId: string, dto: RejectPayrollDeductionDto) {
    const deduction = await this.findOne(id);
    this.assertStatus(deduction.status, [PayrollDeductionStatus.PENDING]);

    return this.prisma.payrollDeduction.update({
      where: { id },
      data: {
        status: PayrollDeductionStatus.REJECTED,
        approvedById: reviewerId,
        approvedAt: new Date(),
        rejectionReason: dto.rejectionReason,
      },
      include: DEDUCTION_INCLUDE,
    });
    // La OP queda como estaba: con saldo pendiente. El asesor tendrá que
    // cobrarla por otro medio, que es exactamente lo que significa el rechazo.
  }

  // ─── Aplicación sobre la nómina ───────────────────────────────────────────

  /**
   * Escribe el descuento sobre el `PayrollItem` del empleado en el periodo y
   * genera el abono que salda la OP.
   *
   * Es el único punto donde la orden pasa a estar pagada, y es idempotente: un
   * descuento ya aplicado se devuelve tal cual en vez de descontarle al empleado
   * por segunda vez.
   */
  async apply(id: string, userId: string, dto: ApplyPayrollDeductionDto) {
    const existing = await this.findOne(id);

    // Idempotencia: el segundo clic encuentra el descuento ya aplicado y sale
    // sin tocar nada. El índice único sobre `payment_id` es la red de abajo.
    if (existing.status === PayrollDeductionStatus.APPLIED) {
      return existing;
    }

    this.assertStatus(existing.status, [PayrollDeductionStatus.APPROVED]);

    const period = await this.prisma.payrollPeriod.findUnique({
      where: { id: dto.periodId },
      select: { id: true, name: true, status: true },
    });
    if (!period) {
      throw new NotFoundException(
        `Periodo de nómina con id ${dto.periodId} no encontrado`,
      );
    }

    // Un periodo pagado ya se le entregó al empleado. Escribirle un descuento
    // encima cambia una colilla que él ya recibió y descuadra lo que se giró.
    if (period.status === PayrollPeriodStatus.PAID) {
      throw new BadRequestException(
        `El periodo "${period.name}" ya está pagado: aplícale el descuento al ` +
          'periodo en curso.',
      );
    }

    const item = await this.prisma.payrollItem.findUnique({
      where: {
        periodId_employeeId: {
          periodId: period.id,
          employeeId: existing.employeeId,
        },
      },
      include: { extraShifts: { select: { amount: true } } },
    });
    if (!item) {
      throw new BadRequestException(
        `El empleado no tiene registro en el periodo "${period.name}". ` +
          'Genera los registros del periodo antes de aplicar el descuento.',
      );
    }

    const newOrderDeductions = new Prisma.Decimal(
      item.orderDeductions ?? 0,
    ).add(existing.amount);

    const newTotal = computePayrollTotal({
      ...item,
      orderDeductions: newOrderDeductions,
      extraShifts: item.extraShifts,
    });

    // Advertencia, no bloqueo: la decisión de repartir el cobro es de nómina, no
    // del sistema. Pero tiene que quedar en el log, porque el art. 149 del CST
    // protege el salario del trabajador y un total negativo significa que la
    // quincena no alcanza a cubrir el trabajo.
    if (newTotal.lessThan(0)) {
      this.logger.warn(
        `El descuento ${id} (${this.formatAmount(existing.amount)}) deja el pago ` +
          `del empleado ${existing.employeeId} en ${this.formatAmount(newTotal)} ` +
          `en el periodo "${period.name}"`,
      );
    }

    try {
      return await this.prisma.$transaction(async (tx) => {
        // El abono que salda la OP. Lleva el monto real —a diferencia del pago
        // de $0 con que nació la orden— y NO genera movimiento de caja:
        // `PAYROLL_DEDUCTION` está en `NON_CASH_METHODS` justamente porque este
        // dinero nunca entra por la ventanilla.
        const payment = await tx.payment.create({
          data: {
            orderId: existing.orderId,
            amount: existing.amount,
            paymentMethod: PaymentMethod.PAYROLL_DEDUCTION,
            paymentDate: new Date(),
            notes: `Descuento aplicado en la nómina "${period.name}"`,
            receivedById: userId,
            pendingCashEntry: false,
            idempotencyKey: dto.idempotencyKey ?? null,
          },
        });

        await tx.payrollItem.update({
          where: { id: item.id },
          data: {
            orderDeductions: newOrderDeductions,
            totalPayment: newTotal,
          },
        });

        const deduction = await tx.payrollDeduction.update({
          where: { id },
          data: {
            status: PayrollDeductionStatus.APPLIED,
            payrollItemId: item.id,
            paymentId: payment.id,
            appliedById: userId,
            appliedAt: new Date(),
          },
          include: DEDUCTION_INCLUDE,
        });

        await this.recalculateOrder(tx, existing.orderId);

        return deduction;
      });
    } catch (error) {
      // Dos aplicaciones en paralelo: la segunda choca contra el índice único de
      // `payment_id` y devuelve el estado real en vez de un 500.
      if (isUniqueViolationOn(error, 'payment_id')) {
        throw new ConflictException(
          'El descuento ya se aplicó. Refresca la página para ver el estado actual.',
        );
      }
      throw error;
    }
  }

  // ─── Cancelación ──────────────────────────────────────────────────────────

  /**
   * Deshace el descuento. Antes de aplicarse solo cambia el estado; si ya se
   * aplicó, devuelve el valor a la nómina del empleado, anula el abono y la OP
   * vuelve a quedar con saldo pendiente.
   */
  async cancel(id: string, userId: string, dto: CancelPayrollDeductionDto) {
    const existing = await this.findOne(id);

    if (existing.status === PayrollDeductionStatus.CANCELLED) {
      return existing;
    }

    if (CANCELLABLE_BEFORE_APPLY.includes(existing.status)) {
      return this.prisma.payrollDeduction.update({
        where: { id },
        data: {
          status: PayrollDeductionStatus.CANCELLED,
          cancelledAt: new Date(),
          cancelReason: dto.cancelReason,
        },
        include: DEDUCTION_INCLUDE,
      });
    }

    if (existing.status !== PayrollDeductionStatus.APPLIED) {
      throw new BadRequestException(
        `Un descuento ${this.statusLabel(existing.status)} no se puede cancelar.`,
      );
    }

    if (existing.payrollItem?.period.status === PayrollPeriodStatus.PAID) {
      throw new BadRequestException(
        `El descuento ya se aplicó en el periodo "${existing.payrollItem.period.name}", ` +
          'que está pagado. Reversa el valor en el periodo siguiente en vez de ' +
          'cambiar una colilla ya entregada.',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      if (existing.payrollItemId) {
        const item = await tx.payrollItem.findUnique({
          where: { id: existing.payrollItemId },
          include: { extraShifts: { select: { amount: true } } },
        });

        if (item) {
          const restored = new Prisma.Decimal(item.orderDeductions ?? 0).sub(
            existing.amount,
          );
          const orderDeductions = restored.lessThan(0)
            ? new Prisma.Decimal(0)
            : restored;

          await tx.payrollItem.update({
            where: { id: item.id },
            data: {
              orderDeductions,
              totalPayment: computePayrollTotal({
                ...item,
                orderDeductions,
                extraShifts: item.extraShifts,
              }),
            },
          });
        }
      }

      // El abono no se borra: se anula. La fila sobrevive marcada para que el
      // historial de pagos siga contando qué pasó y quién lo deshizo.
      if (existing.paymentId) {
        await tx.payment.update({
          where: { id: existing.paymentId },
          data: {
            isVoided: true,
            voidedById: userId,
            voidedAt: new Date(),
            voidReason: `Descuento por nómina cancelado: ${dto.cancelReason}`,
          },
        });
      }

      const deduction = await tx.payrollDeduction.update({
        where: { id },
        data: {
          status: PayrollDeductionStatus.CANCELLED,
          cancelledAt: new Date(),
          cancelReason: dto.cancelReason,
        },
        include: DEDUCTION_INCLUDE,
      });

      await this.recalculateOrder(tx, existing.orderId);

      return deduction;
    });
  }

  // ─── Auxiliares ───────────────────────────────────────────────────────────

  /**
   * Recalcula `paidAmount` y `balance` de la OP con las utilidades canónicas,
   * para que el descuento no invente su propia aritmética de saldos.
   */
  private async recalculateOrder(tx: Prisma.TransactionClient, orderId: string) {
    const order = await tx.order.findUnique({
      where: { id: orderId },
      select: {
        total: true,
        refundedAmount: true,
        reversedAmount: true,
        appliedCreditAmount: true,
        payments: {
          where: ACTIVE_PAYMENT_WHERE,
          select: { amount: true, isVoided: true },
        },
      },
    });
    if (!order) return;

    const paidAmount = computeNetPaidAmount(
      sumActivePayments(order.payments),
      order.refundedAmount ?? 0,
    );

    const balance = computeOrderBalance({
      total: order.total,
      reversedAmount: order.reversedAmount,
      paidAmount,
      appliedCreditAmount: order.appliedCreditAmount,
    });

    await tx.order.update({
      where: { id: orderId },
      data: { paidAmount, balance },
    });
  }

  private assertStatus(
    current: PayrollDeductionStatus,
    allowed: PayrollDeductionStatus[],
  ) {
    if (!allowed.includes(current)) {
      throw new BadRequestException(
        `El descuento está ${this.statusLabel(current)} y esta acción ya no aplica.`,
      );
    }
  }

  private statusLabel(status: PayrollDeductionStatus): string {
    const labels: Record<PayrollDeductionStatus, string> = {
      PENDING: 'pendiente de aprobación',
      APPROVED: 'aprobado',
      REJECTED: 'rechazado',
      APPLIED: 'aplicado',
      CANCELLED: 'cancelado',
    };
    return labels[status];
  }

  private formatAmount(amount: Prisma.Decimal | number): string {
    return `$${Number(amount).toLocaleString('es-CO')}`;
  }
}
