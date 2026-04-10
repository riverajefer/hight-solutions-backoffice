import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { Prisma } from '../../generated/prisma';
import { FilterCashMovementsDto } from './dto';

const MOVEMENT_SELECT = {
  id: true,
  cashSessionId: true,
  receiptNumber: true,
  movementType: true,
  paymentMethod: true,
  amount: true,
  description: true,
  referenceType: true,
  referenceId: true,
  isVoided: true,
  voidedById: true,
  voidedAt: true,
  voidReason: true,
  counterMovementId: true,
  performedById: true,
  createdAt: true,
  updatedAt: true,
  performedBy: {
    select: { id: true, firstName: true, lastName: true, username: true },
  },
  voidedBy: {
    select: { id: true, firstName: true, lastName: true, username: true },
  },
  linkedPayment: {
    select: { id: true, orderId: true, amount: true, paymentMethod: true },
  },
} satisfies Prisma.CashMovementSelect;

@Injectable()
export class CashMovementRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string) {
    return this.prisma.cashMovement.findUnique({
      where: { id },
      select: {
        ...MOVEMENT_SELECT,
        cashSession: {
          select: { id: true, status: true, cashRegisterId: true },
        },
      },
    });
  }

  async findAll(filters: FilterCashMovementsDto) {
    const {
      cashSessionId,
      movementType,
      includeVoided,
      dateFrom,
      dateTo,
      page = 1,
      limit = 50,
    } = filters;

    const where: Prisma.CashMovementWhereInput = {
      ...(cashSessionId && { cashSessionId }),
      ...(movementType && { movementType }),
      ...(!includeVoided && { isVoided: false }),
      ...(dateFrom || dateTo
        ? {
            createdAt: {
              ...(dateFrom && { gte: new Date(dateFrom) }),
              ...(dateTo && { lte: new Date(dateTo) }),
            },
          }
        : {}),
    };

    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.cashMovement.findMany({
        where,
        select: MOVEMENT_SELECT,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.cashMovement.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  async create(data: Prisma.CashMovementCreateInput) {
    return this.prisma.cashMovement.create({
      data,
      select: MOVEMENT_SELECT,
    });
  }

  async update(id: string, data: Prisma.CashMovementUpdateInput) {
    return this.prisma.cashMovement.update({
      where: { id },
      data,
      select: MOVEMENT_SELECT,
    });
  }
}
