import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { CashMovementService } from './cash-movement.service';
import { CashMovementRepository } from './cash-movement.repository';
import { PrismaService } from '../../database/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { ConsecutivesService } from '../consecutives/consecutives.service';
import { CashMovementType, Prisma } from '../../generated/prisma';

describe('CashMovementService', () => {
  let service: CashMovementService;
  let prisma: any;
  let repository: any;

  const openMovement = (overrides: Record<string, any> = {}) => ({
    id: 'cm1',
    cashSessionId: 'cs1',
    receiptNumber: 'RC-2026-0001',
    movementType: CashMovementType.INCOME,
    paymentMethod: 'CASH',
    amount: new Prisma.Decimal(50000),
    description: 'Abono a Orden OP-2026-0001',
    referenceType: 'ORDER',
    referenceId: 'o1',
    isVoided: false,
    linkedPayment: null,
    cashSession: { id: 'cs1', status: 'OPEN' },
    ...overrides,
  });

  beforeEach(async () => {
    prisma = {
      cashSession: { findUnique: jest.fn() },
      cashMovement: {
        create: jest.fn().mockResolvedValue({ id: 'counter1' }),
        update: jest.fn(),
      },
      order: { findUnique: jest.fn() },
      payment: { delete: jest.fn() },
      $transaction: jest.fn(),
    };
    prisma.$transaction.mockImplementation((fn: any) => fn(prisma));

    repository = {
      findById: jest.fn(),
      findAll: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CashMovementService,
        { provide: CashMovementRepository, useValue: repository },
        { provide: PrismaService, useValue: prisma },
        { provide: AuditLogsService, useValue: { logUpdate: jest.fn().mockResolvedValue(undefined) } },
        {
          provide: ConsecutivesService,
          useValue: { generateNumber: jest.fn().mockResolvedValue('RC-2026-0002') },
        },
      ],
    }).compile();

    service = module.get<CashMovementService>(CashMovementService);
  });

  describe('voidMovement', () => {
    it('should create the counter-movement with the inverse type', async () => {
      repository.findById.mockResolvedValue(openMovement());

      await service.voidMovement('cm1', { voidReason: 'Error de digitación' }, 'u1');

      const counterArgs = prisma.cashMovement.create.mock.calls[0][0];
      expect(counterArgs.data.movementType).toBe(CashMovementType.EXPENSE);
      expect(counterArgs.data.receiptNumber).toBe('RC-2026-0001-ANUL');
      expect(counterArgs.data.amount).toEqual(new Prisma.Decimal(50000));
    });

    it.each([
      [CashMovementType.INCOME, CashMovementType.EXPENSE],
      [CashMovementType.EXPENSE, CashMovementType.INCOME],
      [CashMovementType.WITHDRAWAL, CashMovementType.DEPOSIT],
      [CashMovementType.DEPOSIT, CashMovementType.WITHDRAWAL],
    ])('should invert %s into %s', async (original, expected) => {
      repository.findById.mockResolvedValue(openMovement({ movementType: original }));

      await service.voidMovement('cm1', { voidReason: 'Reversa' }, 'u1');

      expect(prisma.cashMovement.create.mock.calls[0][0].data.movementType).toBe(expected);
    });

    it('should mark the original as voided', async () => {
      repository.findById.mockResolvedValue(openMovement());

      await service.voidMovement('cm1', { voidReason: 'Error de digitación' }, 'u1');

      const voidArgs = prisma.cashMovement.update.mock.calls[0][0];
      expect(voidArgs.where).toEqual({ id: 'cm1' });
      expect(voidArgs.data.isVoided).toBe(true);
      expect(voidArgs.data.voidedById).toBe('u1');
      expect(voidArgs.data.voidReason).toBe('Error de digitación');
    });

    it('should reject a movement that is already voided', async () => {
      repository.findById.mockResolvedValue(openMovement({ isVoided: true }));

      await expect(
        service.voidMovement('cm1', { voidReason: 'x' }, 'u1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject a movement from a closed session', async () => {
      repository.findById.mockResolvedValue(
        openMovement({ cashSession: { id: 'cs1', status: 'CLOSED' } }),
      );

      await expect(
        service.voidMovement('cm1', { voidReason: 'x' }, 'u1'),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
