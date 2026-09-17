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
  OrderStatus,
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
import { lockOrderForUpdate } from '../../common/utils/order-lock.util';

/** Estados desde los que todavía se puede cancelar sin tocar la nómina. */
const CANCELLABLE_BEFORE_APPLY: PayrollDeductionStatus[] = [
  PayrollDeductionStatus.PENDING,
  PayrollDeductionStatus.APPROVED,
];

/** Estados en los que el descuento sigue vivo: se va a cobrar o ya se cobró. */
const LIVE_STATUSES: PayrollDeductionStatus[] = [
  ...CANCELLABLE_BEFORE_APPLY,
  PayrollDeductionStatus.APPLIED,
];

/** Estados de la OP sobre los que ya no hay trabajo que descontarle a nadie. */
const NON_BILLABLE_ORDER_STATUSES: OrderStatus[] = [
  OrderStatus.ANULADO,
  OrderStatus.RETURNED,
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
        // Se congela el valor de la orden al momento de pedirlo, y mientras el
        // descuento esté vivo la OP no puede cambiar de valor
        // (`assertOrderValueMatches`): aprobar un monto y descontar otro es
        // justo lo que nadie puede auditar.
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

  // ─── Ciclo de vida de la OP (lo llama orders.service) ─────────────────────

  /**
   * Verifica que la OP se pueda anular. Un descuento ya aplicado significa que
   * al empleado ya se le restó el valor de su quincena: anular la OP dejaría ese
   * dinero descontado por un trabajo que ya no existe. Hay que cancelar primero
   * el descuento, que es lo que se lo devuelve en su liquidación.
   *
   * Se llama antes de consumir cualquier autorización de anulación, para no
   * gastarla en una anulación que después se bloquea.
   */
  async assertOrderCanBeAnnulled(orderId: string) {
    const deduction = await this.prisma.payrollDeduction.findUnique({
      where: { orderId },
      select: { status: true },
    });

    if (deduction?.status === PayrollDeductionStatus.APPLIED) {
      throw new BadRequestException(
        'Esta orden se pagó con un descuento por nómina ya aplicado. Cancélalo ' +
          'desde Nómina › Descuento de Órdenes (se le reversa al empleado en su ' +
          'liquidación) y después anula la orden.',
      );
    }
  }

  /**
   * Cancela el descuento sin aplicar de una OP que se acaba de anular. Sin esto
   * seguía en la bandeja de nómina, listo para descontarle al empleado un
   * trabajo anulado.
   */
  async cancelForAnnulledOrder(orderId: string, orderNumber: string) {
    const { count } = await this.prisma.payrollDeduction.updateMany({
      where: { orderId, status: { in: CANCELLABLE_BEFORE_APPLY } },
      data: {
        status: PayrollDeductionStatus.CANCELLED,
        cancelledAt: new Date(),
        cancelReason: `La orden ${orderNumber} se anuló`,
      },
    });
    return count;
  }

  /**
   * Bloquea de entrada un cambio que alteraría el valor de la OP si tiene un
   * descuento vivo. Es para los caminos que guardan el cambio fuera de una
   * transacción (tasas, prueba de color): ahí no se puede revertir después de
   * recalcular, así que se frena antes de escribir nada.
   */
  async assertNoLiveDeduction(orderId: string, operation: string) {
    const deduction = await this.prisma.payrollDeduction.findUnique({
      where: { orderId },
      select: { status: true },
    });

    if (deduction && LIVE_STATUSES.includes(deduction.status)) {
      throw new BadRequestException(
        `No se puede ${operation}: la orden tiene un descuento por nómina ` +
          `${this.statusLabel(deduction.status)} por su valor actual. Cancela el ` +
          'descuento desde Nómina › Descuento de Órdenes antes de cambiar el ' +
          'valor, y cobra la orden por otro medio.',
      );
    }
  }

  /**
   * Bloquea un cambio de valor de la OP mientras tenga un descuento vivo cuyo
   * monto congelado ya no coincidiría. Se llama con el total recalculado, dentro
   * de la transacción que lo guarda, así que el cambio se revierte entero.
   *
   * No hay forma de volver a pedir el descuento sobre una OP existente: si la OP
   * tiene que cambiar de valor, se cancela el descuento y se cobra por otro
   * medio.
   */
  async assertOrderValueMatches(
    tx: Prisma.TransactionClient,
    orderId: string,
    newTotal: Prisma.Decimal | number | string,
  ) {
    const deduction = await tx.payrollDeduction.findUnique({
      where: { orderId },
      select: { status: true, amount: true },
    });

    if (!deduction || !LIVE_STATUSES.includes(deduction.status)) return;
    if (new Prisma.Decimal(deduction.amount).equals(new Prisma.Decimal(newTotal))) return;

    throw new BadRequestException(
      `La orden tiene un descuento por nómina ${this.statusLabel(deduction.status)} ` +
        `por ${this.formatAmount(deduction.amount)} y este cambio la dejaría en ` +
        `${this.formatAmount(new Prisma.Decimal(newTotal))}. Cancela el descuento desde ` +
        'Nómina › Descuento de Órdenes antes de cambiar el valor, y cobra la orden ' +
        'por otro medio.',
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
    this.assertOrderIsBillable(deduction.order);

    await this.transition(this.prisma, id, [PayrollDeductionStatus.PENDING], {
      status: PayrollDeductionStatus.APPROVED,
      approvedById: reviewerId,
      approvedAt: new Date(),
      rejectionReason: null,
    });
    const updated = await this.findOne(id);

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

    await this.transition(this.prisma, id, [PayrollDeductionStatus.PENDING], {
      status: PayrollDeductionStatus.REJECTED,
      approvedById: reviewerId,
      approvedAt: new Date(),
      rejectionReason: dto.rejectionReason,
    });
    // La OP queda como estaba: con saldo pendiente. El asesor tendrá que
    // cobrarla por otro medio, que es exactamente lo que significa el rechazo.
    return this.findOne(id);
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
    // sin tocar nada.
    if (existing.status === PayrollDeductionStatus.APPLIED) {
      return existing;
    }

    this.assertStatus(existing.status, [PayrollDeductionStatus.APPROVED]);
    this.assertOrderIsBillable(existing.order);

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
      select: { id: true },
    });
    if (!item) {
      throw new BadRequestException(
        `El empleado no tiene registro en el periodo "${period.name}". ` +
          'Genera los registros del periodo antes de aplicar el descuento.',
      );
    }

    try {
      return await this.prisma.$transaction(async (tx) => {
        // 1. Reclamar el descuento. Es la guarda contra dos aplicaciones en
        //    paralelo: la segunda espera el bloqueo de la fila, encuentra el
        //    descuento ya APPLIED y no toca nada. Cada aplicación crea su propio
        //    pago, así que el índice único de `payment_id` nunca las frenaba.
        await this.transition(tx, id, [PayrollDeductionStatus.APPROVED], {
          status: PayrollDeductionStatus.APPLIED,
          payrollItemId: item.id,
          appliedById: userId,
          appliedAt: new Date(),
        });

        // 2. Sumarlo a la nómina con un incremento atómico. Leer el valor,
        //    sumarle en memoria y escribirlo dejaba que dos descuentos del mismo
        //    empleado aplicados a la vez se pisaran: las dos OP quedaban pagadas
        //    y en la quincena solo se restaba uno.
        const updatedItem = await tx.payrollItem.update({
          where: { id: item.id },
          data: { orderDeductions: { increment: existing.amount } },
          include: { extraShifts: { select: { amount: true } } },
        });
        const newTotal = computePayrollTotal({
          ...updatedItem,
          extraShifts: updatedItem.extraShifts,
        });
        await tx.payrollItem.update({
          where: { id: item.id },
          data: { totalPayment: newTotal },
        });

        // Advertencia, no bloqueo: la decisión de repartir el cobro es de
        // nómina, no del sistema. Pero tiene que quedar en el log, porque el
        // art. 149 del CST protege el salario del trabajador y un total negativo
        // significa que la quincena no alcanza a cubrir el trabajo.
        if (newTotal.lessThan(0)) {
          this.logger.warn(
            `El descuento ${id} (${this.formatAmount(existing.amount)}) deja el pago ` +
              `del empleado ${existing.employeeId} en ${this.formatAmount(newTotal)} ` +
              `en el periodo "${period.name}"`,
          );
        }

        // 3. El abono que salda la OP. Lleva el monto real —a diferencia del
        //    pago de $0 con que nació la orden— y NO genera movimiento de caja:
        //    `PAYROLL_DEDUCTION` está en `NON_CASH_METHODS` justamente porque
        //    este dinero nunca entra por la ventanilla.
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

        const deduction = await tx.payrollDeduction.update({
          where: { id },
          data: { paymentId: payment.id },
          include: DEDUCTION_INCLUDE,
        });

        await this.recalculateOrder(tx, existing.orderId);

        return deduction;
      });
    } catch (error) {
      // Perdió la carrera contra otra aplicación del mismo descuento: por el
      // reclamo del paso 1 o, si el cliente mandó la misma llave, por el índice
      // único de `idempotency_key`. Si la otra terminó, se devuelve su resultado
      // en vez de un error, que es lo que promete la idempotencia.
      if (
        error instanceof ConflictException ||
        isUniqueViolationOn(error, 'idempotency_key') ||
        isUniqueViolationOn(error, 'payment_id')
      ) {
        const current = await this.findOne(id);
        if (current.status === PayrollDeductionStatus.APPLIED) return current;
        throw error instanceof ConflictException
          ? error
          : new ConflictException(
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
      await this.transition(this.prisma, id, CANCELLABLE_BEFORE_APPLY, {
        status: PayrollDeductionStatus.CANCELLED,
        cancelledAt: new Date(),
        cancelReason: dto.cancelReason,
      });
      return this.findOne(id);
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
      // Reclamar primero: dos cancelaciones en paralelo devolverían el valor a
      // la nómina dos veces.
      await this.transition(tx, id, [PayrollDeductionStatus.APPLIED], {
        status: PayrollDeductionStatus.CANCELLED,
        cancelledAt: new Date(),
        cancelReason: dto.cancelReason,
      });

      if (existing.payrollItemId) {
        // Decremento atómico, por la misma razón que el incremento de `apply()`.
        const decremented = await tx.payrollItem.update({
          where: { id: existing.payrollItemId },
          data: { orderDeductions: { decrement: existing.amount } },
          include: { extraShifts: { select: { amount: true } } },
        });

        const restored = new Prisma.Decimal(decremented.orderDeductions ?? 0);
        const orderDeductions = restored.lessThan(0)
          ? new Prisma.Decimal(0)
          : restored;

        await tx.payrollItem.update({
          where: { id: decremented.id },
          data: {
            orderDeductions,
            totalPayment: computePayrollTotal({
              ...decremented,
              orderDeductions,
              extraShifts: decremented.extraShifts,
            }),
          },
        });
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

      await this.recalculateOrder(tx, existing.orderId);

      return tx.payrollDeduction.findUniqueOrThrow({
        where: { id },
        include: DEDUCTION_INCLUDE,
      });
    });
  }

  // ─── Auxiliares ───────────────────────────────────────────────────────────

  /**
   * Cambia el estado solo si el descuento sigue en uno de `from`.
   *
   * Es un `updateMany` condicionado y no un `update`: entre la lectura y la
   * escritura otra petición pudo aprobar, rechazar, aplicar o cancelar el mismo
   * descuento, y sin la condición la segunda escritura pisaba a la primera.
   */
  private async transition(
    client: Prisma.TransactionClient,
    id: string,
    from: PayrollDeductionStatus[],
    data: Prisma.PayrollDeductionUncheckedUpdateManyInput,
  ) {
    const { count } = await client.payrollDeduction.updateMany({
      where: { id, status: { in: from } },
      data,
    });

    if (count === 0) {
      const current = await client.payrollDeduction.findUnique({
        where: { id },
        select: { status: true },
      });
      throw new ConflictException(
        current
          ? `El descuento ya está ${this.statusLabel(current.status)}. Refresca la página para ver el estado actual.`
          : `Descuento con id ${id} no encontrado`,
      );
    }
  }

  /**
   * Una OP anulada o devuelta ya no tiene trabajo que cobrar: aprobar o aplicar
   * su descuento le restaría al empleado de su salario algo que no debe.
   */
  private assertOrderIsBillable(order: { orderNumber: string; status: OrderStatus }) {
    if (NON_BILLABLE_ORDER_STATUSES.includes(order.status)) {
      const estado = order.status === OrderStatus.ANULADO ? 'anulada' : 'devuelta';
      throw new BadRequestException(
        `La orden ${order.orderNumber} está ${estado}: no hay nada que descontarle ` +
          'al empleado. Cancela el descuento.',
      );
    }
  }

  /**
   * Recalcula `paidAmount` y `balance` de la OP con las utilidades canónicas,
   * para que el descuento no invente su propia aritmética de saldos.
   */
  private async recalculateOrder(tx: Prisma.TransactionClient, orderId: string) {
    // Bloquea la OP antes de leerla: ver `lockOrderForUpdate`.
    await lockOrderForUpdate(tx, orderId);
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
