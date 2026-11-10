import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { InventoryMovementType, Prisma, SupplyLotStatus } from '../../generated/prisma';
import { PrismaService } from '../../database/prisma.service';
import { SupplyLotsService } from './supply-lots.service';
import { SupplyLotsRepository } from './supply-lots.repository';

const D = (n: number) => new Prisma.Decimal(n);

const lotRecord = (over: Record<string, unknown> = {}) => ({
  id: 'lot-1',
  supplyId: 'sup-1',
  sequence: 1,
  code: 'ROL-UV-0001',
  initialQuantity: D(100),
  remainingQuantity: D(100),
  lowStockQuantity: D(10),
  unitCost: D(100),
  totalCost: D(10000),
  receivedAt: new Date('2026-11-10T05:00:00Z'),
  status: SupplyLotStatus.AVAILABLE,
  depletedAt: null,
  wasteQuantity: D(0),
  notes: null,
  voidReason: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  supply: { id: 'sup-1', name: 'Rollo DTF UV', lotPrefix: 'ROL-UV', consumptionUnit: { id: 'u', name: 'metro', abbreviation: 'm' } },
  createdBy: { id: 'user-1', firstName: 'A', lastName: 'B', username: 'ab' },
  ...over,
});

const lockedSupply = (over: Record<string, unknown> = {}) => ({
  id: 'sup-1',
  name: 'Rollo DTF UV',
  is_active: true,
  track_lots: true,
  lot_prefix: 'ROL-UV',
  low_stock_percent: null,
  ...over,
});

describe('SupplyLotsService', () => {
  let service: SupplyLotsService;
  let repo: Record<string, jest.Mock>;
  let tx: any;
  let prisma: any;

  beforeEach(async () => {
    tx = {
      supplyLot: { create: jest.fn().mockResolvedValue({ id: 'lot-1' }), update: jest.fn() },
      supply: { update: jest.fn().mockResolvedValue({ currentStock: D(100) }) },
      inventoryMovement: { create: jest.fn() },
    };
    prisma = { $transaction: jest.fn((fn: (t: unknown) => unknown) => fn(tx)) };
    repo = {
      findAll: jest.fn(),
      findById: jest.fn().mockResolvedValue(lotRecord()),
      findMovements: jest.fn().mockResolvedValue([]),
      findLotSuppliesWithActiveLots: jest.fn(),
      lockSupply: jest.fn().mockResolvedValue(lockedSupply()),
      lockLot: jest.fn(),
      nextSequence: jest.fn().mockResolvedValue(1),
      countNonEntryMovements: jest.fn().mockResolvedValue(0),
      promoteNextLot: jest.fn().mockResolvedValue(null),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SupplyLotsService,
        { provide: SupplyLotsRepository, useValue: repo },
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = module.get(SupplyLotsService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('create', () => {
    const dto = { supplyId: 'sup-1', initialQuantity: 100, unitCost: 100, receivedAt: '2026-11-10' };

    it('crea el lote con código, umbral, costos y la entrada al kardex', async () => {
      repo.nextSequence.mockResolvedValue(7);
      await service.create(dto, 'user-1');

      const data = tx.supplyLot.create.mock.calls[0][0].data;
      expect(data.code).toBe('ROL-UV-0007');
      expect(data.totalCost.toNumber()).toBe(10000);
      expect(data.lowStockQuantity.toNumber()).toBe(10);
      expect(data.remainingQuantity.toNumber()).toBe(100);
      // Día de Bogotá, no medianoche UTC.
      expect(data.receivedAt.toISOString()).toBe('2026-11-10T05:00:00.000Z');

      expect(tx.supply.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { currentStock: { increment: D(100) } } }),
      );
      const mov = tx.inventoryMovement.create.mock.calls[0][0].data;
      expect(mov).toMatchObject({ type: InventoryMovementType.ENTRY, lotId: 'lot-1', referenceType: 'SUPPLY_LOT' });
      expect(mov.previousStock.toNumber()).toBe(0);
      expect(mov.newStock.toNumber()).toBe(100);
    });

    it('rechaza un insumo sin control por lotes', async () => {
      repo.lockSupply.mockResolvedValue(lockedSupply({ track_lots: false }));
      await expect(service.create(dto, 'user-1')).rejects.toThrow(BadRequestException);
      expect(tx.supplyLot.create).not.toHaveBeenCalled();
    });

    it('rechaza costo por metro y total a la vez', async () => {
      await expect(
        service.create({ ...dto, totalCost: 10000 }, 'user-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('404 si el insumo no existe', async () => {
      repo.lockSupply.mockResolvedValue(null);
      await expect(service.create(dto, 'user-1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('void', () => {
    it('saca el saldo del stock y marca el lote como anulado', async () => {
      tx.supply.update.mockResolvedValue({ currentStock: D(0) });
      await service.void('lot-1', { reason: 'Largo mal digitado' }, 'user-1');

      expect(tx.supply.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { currentStock: { decrement: D(100) } } }),
      );
      expect(tx.inventoryMovement.create.mock.calls[0][0].data.type).toBe(InventoryMovementType.ADJUSTMENT);
      expect(tx.supplyLot.update.mock.calls[0][0].data).toMatchObject({
        status: SupplyLotStatus.VOIDED,
        remainingQuantity: 0,
        voidReason: 'Largo mal digitado',
      });
    });

    it('rechaza un lote que ya tuvo movimientos distintos de su entrada', async () => {
      repo.countNonEntryMovements.mockResolvedValue(1);
      await expect(service.void('lot-1', { reason: 'xxxxx' }, 'user-1')).rejects.toThrow(BadRequestException);
      expect(tx.supplyLot.update).not.toHaveBeenCalled();
    });

    it('rechaza un lote ya agotado', async () => {
      repo.findById.mockResolvedValue(lotRecord({ status: SupplyLotStatus.DEPLETED }));
      await expect(service.void('lot-1', { reason: 'xxxxx' }, 'user-1')).rejects.toThrow(BadRequestException);
    });
  });

  describe('close', () => {
    it('saca el saldo como merma, cierra el rollo y monta el siguiente si estaba en uso', async () => {
      repo.findById.mockResolvedValue(lotRecord({ remainingQuantity: D(4), status: SupplyLotStatus.IN_USE }));
      tx.supply.update.mockResolvedValue({ currentStock: D(0) });
      await service.close('lot-1', { reason: 'Fin del rollo' }, 'user-1');

      const mov = tx.inventoryMovement.create.mock.calls[0][0].data;
      expect(mov).toMatchObject({ type: InventoryMovementType.ADJUSTMENT, referenceType: 'LOT_CLOSE' });
      expect(mov.quantity.toNumber()).toBe(4);
      expect(tx.supplyLot.update.mock.calls[0][0].data).toMatchObject({
        status: SupplyLotStatus.CLOSED,
        remainingQuantity: 0,
        wasteQuantity: { increment: D(4) },
      });
      expect(repo.promoteNextLot).toHaveBeenCalledWith(tx, 'sup-1');
    });

    it('rechaza cerrar un rollo ya agotado', async () => {
      repo.findById.mockResolvedValue(lotRecord({ status: SupplyLotStatus.DEPLETED }));
      await expect(service.close('lot-1', { reason: 'xxxxx' }, 'user-1')).rejects.toThrow(BadRequestException);
    });
  });

  describe('setInUse', () => {
    it('desmonta el que estaba en uso y monta este', async () => {
      tx.supplyLot.updateMany = jest.fn();
      await service.setInUse('lot-1');
      expect(tx.supplyLot.updateMany).toHaveBeenCalledWith({
        where: { supplyId: 'sup-1', status: SupplyLotStatus.IN_USE },
        data: { status: SupplyLotStatus.AVAILABLE },
      });
      expect(tx.supplyLot.update).toHaveBeenCalledWith({ where: { id: 'lot-1' }, data: { status: SupplyLotStatus.IN_USE } });
    });

    it('no monta un rollo agotado', async () => {
      repo.findById.mockResolvedValue(lotRecord({ status: SupplyLotStatus.DEPLETED, remainingQuantity: D(0) }));
      await expect(service.setInUse('lot-1')).rejects.toThrow(BadRequestException);
    });
  });

  describe('respuesta', () => {
    it('separa el consumo de OP de la merma', async () => {
      repo.findById.mockResolvedValue(
        lotRecord({ status: SupplyLotStatus.CLOSED, remainingQuantity: D(0), wasteQuantity: D(4) }),
      );
      const res = await service.findOne('lot-1');
      expect(res).toMatchObject({ consumedQuantity: 96, wasteQuantity: 4, wasteValue: 400, consumedPercent: 100 });
    });

    it('deriva consumido, porcentaje, valor restante y estado visible', async () => {
      repo.findById.mockResolvedValue(lotRecord({ remainingQuantity: D(9) }));
      const res = await service.findOne('lot-1');
      expect(res).toMatchObject({
        consumedQuantity: 91,
        consumedPercent: 91,
        remainingValue: 900,
        displayStatus: 'LOW',
      });
    });

    it('un lote anulado no cuenta como consumido', async () => {
      repo.findById.mockResolvedValue(
        lotRecord({ status: SupplyLotStatus.VOIDED, remainingQuantity: D(0) }),
      );
      const res = await service.findOne('lot-1');
      expect(res.consumedQuantity).toBe(0);
      expect(res.displayStatus).toBe('VOIDED');
    });
  });

  describe('getSummary', () => {
    it('suma saldo y valor de los lotes vigentes y cuenta los bajos', async () => {
      repo.findLotSuppliesWithActiveLots.mockResolvedValue([
        {
          id: 'sup-1',
          name: 'Rollo DTF UV',
          lotPrefix: 'ROL-UV',
          lowStockPercent: null,
          currentStock: D(105),
          consumptionUnit: { id: 'u', name: 'metro', abbreviation: 'm' },
          lots: [
            { remainingQuantity: D(100), lowStockQuantity: D(10), unitCost: D(100), status: SupplyLotStatus.AVAILABLE },
            { remainingQuantity: D(5), lowStockQuantity: D(10), unitCost: D(200), status: SupplyLotStatus.IN_USE },
          ],
        },
      ]);
      const [s] = await service.getSummary();
      expect(s).toMatchObject({ activeLots: 2, lowLots: 1, remainingQuantity: 105, remainingValue: 11000, lowStockPercent: 10 });
    });
  });
});
