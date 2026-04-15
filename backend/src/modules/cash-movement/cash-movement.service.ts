import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { ConsecutivesService } from '../consecutives/consecutives.service';
import { CashMovementRepository } from './cash-movement.repository';
import {
  CreateCashMovementDto,
  FilterCashMovementsDto,
  VoidCashMovementDto,
} from './dto';
import { CashSessionStatus, Prisma } from '../../generated/prisma';

@Injectable()
export class CashMovementService {
  constructor(
    private readonly repository: CashMovementRepository,
    private readonly consecutivesService: ConsecutivesService,
    private readonly prisma: PrismaService,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  async findAll(filters: FilterCashMovementsDto) {
    return this.repository.findAll(filters);
  }

  async findOne(id: string) {
    const movement = await this.repository.findById(id);
    if (!movement) {
      throw new NotFoundException(`Movimiento de caja ${id} no encontrado`);
    }
    return movement;
  }

  async createMovement(dto: CreateCashMovementDto, userId: string) {
    // Validate session exists and is open
    const session = await this.prisma.cashSession.findUnique({
      where: { id: dto.cashSessionId },
      select: { id: true, status: true },
    });
    if (!session) {
      throw new NotFoundException(`Sesión de caja ${dto.cashSessionId} no encontrada`);
    }
    if (session.status !== CashSessionStatus.OPEN) {
      throw new BadRequestException(
        'No se pueden registrar movimientos en una sesión cerrada',
      );
    }

    const receiptNumber = await this.consecutivesService.generateNumber('CASH_RECEIPT');
    const amount = new Prisma.Decimal(dto.amount);

    const movementId = await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // Create the movement
      const movement = await tx.cashMovement.create({
        data: {
          cashSessionId: dto.cashSessionId,
          receiptNumber,
          movementType: dto.movementType,
          paymentMethod: dto.paymentMethod || 'CASH',
          amount,
          description: dto.description,
          referenceType: dto.referenceType,
          referenceId: dto.referenceId,
          performedById: userId,
        },
        select: { id: true },
      });

      // If linked to an order, create Payment and update order balance
      if (dto.referenceType === 'ORDER' && dto.referenceId) {
        const order = await tx.order.findUnique({
          where: { id: dto.referenceId },
          select: { id: true, total: true, paidAmount: true, balance: true, status: true },
        });
        if (!order) {
          throw new NotFoundException(`Orden ${dto.referenceId} no encontrada`);
        }

        const paymentAmount = amount;
        if (paymentAmount.greaterThan(order.balance)) {
          throw new BadRequestException(
            `El monto ($${paymentAmount}) excede el saldo pendiente de la orden ($${order.balance})`,
          );
        }

        // Create linked Payment record
        await tx.payment.create({
          data: {
            orderId: dto.referenceId,
            amount: paymentAmount,
            paymentMethod: dto.paymentMethod || 'CASH',
            receivedById: userId,
            cashMovementId: movement.id,
          },
        });

        // Update order balance
        const newPaidAmount = new Prisma.Decimal(order.paidAmount.toString()).add(paymentAmount);
        const newBalance = new Prisma.Decimal(order.total.toString()).sub(newPaidAmount);
        await tx.order.update({
          where: { id: dto.referenceId },
          data: { paidAmount: newPaidAmount, balance: newBalance },
        });
      }

      return movement.id;
    });

    const created = await this.repository.findById(movementId);

    setImmediate(() => {
      this.auditLogsService
        .logCreate('CashMovement', movementId, created, userId)
        .catch(() => {});
    });

    return created;
  }

  async voidMovement(id: string, dto: VoidCashMovementDto, userId: string) {
    const movement = await this.repository.findById(id);
    if (!movement) {
      throw new NotFoundException(`Movimiento de caja ${id} no encontrado`);
    }
    if (movement.isVoided) {
      throw new BadRequestException('El movimiento ya está anulado');
    }
    if ((movement as any).cashSession?.status !== CashSessionStatus.OPEN) {
      throw new BadRequestException(
        'Solo se pueden anular movimientos de sesiones abiertas',
      );
    }

    await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // Mark original as voided
      await tx.cashMovement.update({
        where: { id },
        data: {
          isVoided: true,
          voidedById: userId,
          voidedAt: new Date(),
          voidReason: dto.voidReason,
        },
      });

      // Create counter-movement (reversal)
      const counter = await tx.cashMovement.create({
        data: {
          cashSessionId: movement.cashSessionId,
          receiptNumber: `${movement.receiptNumber}-ANUL`,
          movementType: movement.movementType,
          paymentMethod: movement.paymentMethod,
          amount: movement.amount,
          description: `ANULACIÓN: ${movement.description}`,
          referenceType: movement.referenceType,
          referenceId: movement.referenceId,
          performedById: userId,
          isVoided: false,
        },
        select: { id: true },
      });

      // Link original → counter
      await tx.cashMovement.update({
        where: { id },
        data: { counterMovementId: counter.id },
      });

      // If movement was linked to an order payment, revert order balance
      if (movement.linkedPayment) {
        const payment = movement.linkedPayment;
        const order = await tx.order.findUnique({
          where: { id: payment.orderId },
          select: { id: true, total: true, paidAmount: true },
        });
        if (order) {
          const revertedPaid = new Prisma.Decimal(order.paidAmount.toString()).sub(
            payment.amount,
          );
          const revertedBalance = new Prisma.Decimal(order.total.toString()).sub(revertedPaid);
          await tx.order.update({
            where: { id: payment.orderId },
            data: { paidAmount: revertedPaid, balance: revertedBalance },
          });
          // Delete the linked payment
          await tx.payment.delete({ where: { id: payment.id } });
        }
      }
    });

    const voided = await this.repository.findById(id);

    setImmediate(() => {
      this.auditLogsService
        .logUpdate('CashMovement', id, movement, voided, userId)
        .catch(() => {});
    });

    return voided;
  }
}
