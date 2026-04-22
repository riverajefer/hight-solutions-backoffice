import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { AccountPayableStatus } from '../../generated/prisma';
import { PrismaService } from '../../database/prisma.service';
import { ConsecutivesService } from '../consecutives/consecutives.service';
import { StorageService } from '../storage/storage.service';
import { AccountsPayableRepository } from './accounts-payable.repository';
import {
  CancelAccountPayableDto,
  CreateAccountPayableDto,
  CreateAttachmentDto,
  FilterAccountPayableDto,
  RegisterPaymentDto,
  SetInstallmentsDto,
  UpdateAccountPayableDto,
  UpdateInstallmentDto,
} from './dto';

const READONLY_STATUSES: AccountPayableStatus[] = [
  AccountPayableStatus.PAID,
  AccountPayableStatus.CANCELLED,
];

@Injectable()
export class AccountsPayableService {
  private readonly logger = new Logger(AccountsPayableService.name);

  constructor(
    private readonly repository: AccountsPayableRepository,
    private readonly prisma: PrismaService,
    private readonly consecutivesService: ConsecutivesService,
    private readonly storageService: StorageService,
  ) {}

  async findAll(filters: FilterAccountPayableDto) {
    return this.repository.findAll(filters);
  }

  async findOne(id: string) {
    const ap = await this.repository.findById(id);
    if (!ap) {
      throw new NotFoundException(`Cuenta por pagar con id ${id} no encontrada`);
    }
    return ap;
  }

  async create(dto: CreateAccountPayableDto, createdById: string) {
    const apNumber = await this.generateApNumber();

    if (dto.expenseOrderId) {
      const existing = await this.repository.findByExpenseOrderId(dto.expenseOrderId);
      if (existing) {
        throw new BadRequestException(
          `La Orden de Gasto ${dto.expenseOrderId} ya tiene una cuenta por pagar asociada`,
        );
      }
    }

    return this.repository.create({
      apNumber,
      expenseType: { connect: { id: dto.expenseTypeId } },
      expenseSubcategory: { connect: { id: dto.expenseSubcategoryId } },
      description: dto.description,
      observations: dto.observations,
      totalAmount: dto.totalAmount,
      paidAmount: 0,
      balance: dto.totalAmount,
      dueDate: new Date(dto.dueDate),
      isRecurring: dto.isRecurring ?? false,
      recurringDay: dto.recurringDay,
      status: AccountPayableStatus.PENDING,
      createdBy: { connect: { id: createdById } },
      ...(dto.supplierId && { supplier: { connect: { id: dto.supplierId } } }),
      ...(dto.expenseOrderId && { expenseOrder: { connect: { id: dto.expenseOrderId } } }),
    });
  }

  async update(id: string, dto: UpdateAccountPayableDto) {
    const ap = await this.findOne(id);

    if (READONLY_STATUSES.includes(ap.status as AccountPayableStatus)) {
      throw new BadRequestException(
        `No se puede editar una cuenta en estado ${ap.status}`,
      );
    }

    const hasPayments = Number(ap.paidAmount) > 0;
    if (hasPayments && dto.totalAmount !== undefined) {
      throw new BadRequestException(
        'No se puede cambiar el monto total de una cuenta que ya tiene pagos registrados',
      );
    }

    const updateData: Record<string, unknown> = {};
    if (dto.description !== undefined) updateData.description = dto.description;
    if (dto.observations !== undefined) updateData.observations = dto.observations;
    if (dto.dueDate !== undefined) updateData.dueDate = new Date(dto.dueDate);
    if (dto.isRecurring !== undefined) updateData.isRecurring = dto.isRecurring;
    if (dto.recurringDay !== undefined) updateData.recurringDay = dto.recurringDay;
    if (dto.supplierId !== undefined) {
      updateData.supplier = dto.supplierId
        ? { connect: { id: dto.supplierId } }
        : { disconnect: true };
    }

    if (dto.totalAmount !== undefined) {
      const newBalance = dto.totalAmount - Number(ap.paidAmount);
      updateData.totalAmount = dto.totalAmount;
      updateData.balance = newBalance;
    }

    return this.repository.update(id, updateData);
  }

  async cancel(id: string, dto: CancelAccountPayableDto, cancelledById: string) {
    const ap = await this.findOne(id);

    if (ap.status === AccountPayableStatus.PAID) {
      throw new BadRequestException('No se puede anular una cuenta que ya fue pagada');
    }
    if (ap.status === AccountPayableStatus.CANCELLED) {
      throw new BadRequestException('La cuenta ya está anulada');
    }

    return this.repository.update(id, {
      status: AccountPayableStatus.CANCELLED,
      cancelledAt: new Date(),
      cancelledBy: { connect: { id: cancelledById } },
      cancelReason: dto.cancelReason,
    });
  }

  async registerPayment(id: string, dto: RegisterPaymentDto, registeredById: string) {
    const ap = await this.findOne(id);

    if (ap.status === AccountPayableStatus.CANCELLED) {
      throw new BadRequestException('No se puede registrar un pago en una cuenta anulada');
    }
    if (ap.status === AccountPayableStatus.PAID) {
      throw new BadRequestException('La cuenta ya está completamente pagada');
    }

    const currentBalance = Number(ap.balance);
    if (dto.amount > currentBalance) {
      throw new BadRequestException(
        `El monto del pago (${dto.amount}) supera el saldo pendiente (${currentBalance})`,
      );
    }

    const newPaidAmount = Number(ap.paidAmount) + dto.amount;
    const newBalance = Number(ap.totalAmount) - newPaidAmount;
    const newStatus =
      newBalance <= 0 ? AccountPayableStatus.PAID : AccountPayableStatus.PARTIAL;

    let cashMovementId: string | undefined;

    if (dto.cashSessionId) {
      const session = await this.prisma.cashSession.findUnique({
        where: { id: dto.cashSessionId },
      });
      if (!session || session.status !== 'OPEN') {
        throw new BadRequestException(
          'La sesión de caja indicada no está activa o no existe',
        );
      }

      const receiptNumber = await this.consecutivesService.generateNumber('CASH_RECEIPT');
      const cashMovement = await this.prisma.cashMovement.create({
        data: {
          amount: dto.amount,
          movementType: 'EXPENSE',
          paymentMethod: dto.paymentMethod,
          description: `Pago Cuenta por Pagar ${ap.apNumber}`,
          receiptNumber,
          cashSessionId: dto.cashSessionId,
          performedById: registeredById,
          referenceType: 'ACCOUNT_PAYABLE',
          referenceId: ap.id,
        },
      });
      cashMovementId = cashMovement.id;
    }

    const payment = await this.repository.createPayment({
      amount: dto.amount,
      paymentMethod: dto.paymentMethod,
      paymentDate: new Date(dto.paymentDate),
      reference: dto.reference,
      notes: dto.notes,
      receiptFileId: dto.receiptFileId,
      accountPayable: { connect: { id } },
      registeredBy: { connect: { id: registeredById } },
      ...(cashMovementId && { cashMovement: { connect: { id: cashMovementId } } }),
    });

    await this.repository.update(id, {
      paidAmount: newPaidAmount,
      balance: newBalance,
      status: newStatus,
    });

    return payment;
  }

  async getPaymentHistory(id: string) {
    await this.findOne(id);
    return this.repository.getPaymentHistory(id);
  }

  async deletePayment(id: string, paymentId: string, userId: string) {
    await this.findOne(id);
    const payment = await this.repository.findPaymentById(paymentId);
    if (!payment || payment.accountPayableId !== id) {
      throw new NotFoundException(`Pago con id ${paymentId} no encontrado`);
    }

    const ap = await this.findOne(id);
    const paymentAmount = Number(payment.amount);
    const newPaidAmount = Number(ap.paidAmount) - paymentAmount;
    const newBalance = Number(ap.totalAmount) - newPaidAmount;

    let newStatus: AccountPayableStatus;
    if (newPaidAmount <= 0) {
      newStatus =
        ap.status === AccountPayableStatus.OVERDUE
          ? AccountPayableStatus.OVERDUE
          : AccountPayableStatus.PENDING;
    } else {
      newStatus = AccountPayableStatus.PARTIAL;
    }

    await this.repository.deletePayment(paymentId);
    await this.repository.update(id, {
      paidAmount: newPaidAmount,
      balance: newBalance,
      status: newStatus,
    });

    return { success: true };
  }

  async getSummary() {
    return this.repository.getSummary();
  }

  async generateApNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const last = await this.repository.getLastApNumber(year);

    let sequence = 1;
    if (last?.apNumber) {
      const parts = last.apNumber.split('-');
      sequence = parseInt(parts[2], 10) + 1;
    }

    return `CP-${year}-${String(sequence).padStart(3, '0')}`;
  }

  async createFromExpenseOrder(
    expenseOrderId: string,
    description: string,
    totalAmount: number,
    createdById: string,
  ) {
    const existing = await this.repository.findByExpenseOrderId(expenseOrderId);
    if (existing) return existing;

    const expenseOrder = await this.prisma.expenseOrder.findUnique({
      where: { id: expenseOrderId },
      select: { expenseTypeId: true, expenseSubcategoryId: true },
    });

    if (!expenseOrder) throw new BadRequestException(`No se encontró la Orden de Gasto ${expenseOrderId}`);

    const apNumber = await this.generateApNumber();
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 30);

    return this.repository.create({
      apNumber,
      expenseType: { connect: { id: expenseOrder.expenseTypeId } },
      expenseSubcategory: { connect: { id: expenseOrder.expenseSubcategoryId } },
      description,
      totalAmount,
      paidAmount: 0,
      balance: totalAmount,
      dueDate,
      isRecurring: false,
      status: AccountPayableStatus.PENDING,
      createdBy: { connect: { id: createdById } },
      expenseOrder: { connect: { id: expenseOrderId } },
    });
  }

  // ─── Attachments ─────────────────────────────────────────────────────────────

  async addAttachment(id: string, dto: CreateAttachmentDto, uploadedById: string) {
    await this.findOne(id);
    return this.repository.createAttachment({
      fileUrl: dto.fileUrl,
      fileName: dto.fileName,
      fileType: dto.fileType,
      accountPayable: { connect: { id } },
      uploadedBy: { connect: { id: uploadedById } },
    });
  }

  async removeAttachment(id: string, attachmentId: string) {
    await this.findOne(id);
    const attachment = await this.repository.findAttachmentById(attachmentId);
    if (!attachment || attachment.accountPayableId !== id) {
      throw new NotFoundException(`Adjunto con id ${attachmentId} no encontrado`);
    }
    await this.repository.deleteAttachment(attachmentId);
    return { success: true };
  }

  // ─── Installments ─────────────────────────────────────────────────────────────

  async setInstallments(id: string, dto: SetInstallmentsDto, userId: string) {
    const ap = await this.findOne(id);

    if (ap.status === AccountPayableStatus.CANCELLED) {
      throw new BadRequestException('No se puede definir un plan de cuotas en una cuenta anulada');
    }

    const total = dto.installments.reduce((sum, i) => sum + i.amount, 0);
    const apTotal = Number(ap.totalAmount);
    if (Math.abs(total - apTotal) > 1) {
      throw new BadRequestException(
        `La suma de las cuotas (${total}) no coincide con el total de la cuenta (${apTotal})`,
      );
    }

    return this.repository.setInstallments(id, dto.installments, userId);
  }

  async getInstallments(id: string) {
    await this.findOne(id);
    return this.repository.findInstallments(id);
  }

  async toggleInstallmentPaid(id: string, installmentId: string, dto: UpdateInstallmentDto, userId: string) {
    await this.findOne(id);
    const installment = await this.repository.findInstallmentById(installmentId);
    if (!installment || installment.accountPayableId !== id) {
      throw new NotFoundException(`Cuota con id ${installmentId} no encontrada`);
    }

    return this.repository.updateInstallment(installmentId, {
      isPaid: dto.isPaid,
      paidAt: dto.isPaid ? new Date() : null,
      paidBy: dto.isPaid ? { connect: { id: userId } } : { disconnect: true },
    });
  }

  async deleteInstallment(id: string, installmentId: string) {
    await this.findOne(id);
    const installment = await this.repository.findInstallmentById(installmentId);
    if (!installment || installment.accountPayableId !== id) {
      throw new NotFoundException(`Cuota con id ${installmentId} no encontrada`);
    }
    await this.repository.deleteInstallment(installmentId);
    return { success: true };
  }

  @Cron('0 0 * * *')
  async markOverdueAccounts() {
    this.logger.log('Ejecutando tarea: marcar cuentas vencidas como OVERDUE');
    const result = await this.repository.markOverdue();
    this.logger.log(`Cuentas marcadas como OVERDUE: ${result.count}`);
  }
}
