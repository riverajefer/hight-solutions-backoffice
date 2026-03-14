import { Test, TestingModule } from '@nestjs/testing';
import { InventoryService } from './inventory.service';
import { InventoryRepository } from './inventory.repository';
import { PrismaService } from '../../database/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { BadRequestException } from '@nestjs/common';
import { InventoryMovementType, NotificationType } from '../../generated/prisma';

describe('InventoryService', () => {
  let service: InventoryService;
  let repository: jest.Mocked<InventoryRepository>;
  let prisma: jest.Mocked<PrismaService>;
  let notificationsService: jest.Mocked<NotificationsService>;

  const mockRepository = {
    create: jest.fn(),
    findAll: jest.fn(),
    findById: jest.fn(),
    findBySupplyId: jest.fn(),
    getLowStockSupplies: jest.fn(),
    getLowStockSuppliesRaw: jest.fn(),
    getInventoryValuation: jest.fn(),
  };

  let mockPrisma: any;

  const mockNotificationsService = {
    createBlockNotification: jest.fn(),
    notifyUsersWithPermission: jest.fn(),
  };

  beforeEach(async () => {
    mockPrisma = {
      supply: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      userRole: {
        findMany: jest.fn(),
      },
      inventoryMovement: {
        findUnique: jest.fn(),
        create: jest.fn(),
      },
      workOrderItemSupply: {
        findMany: jest.fn(),
      },
    };
    mockPrisma.$transaction = jest.fn((callback) => callback(mockPrisma));
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InventoryService,
        { provide: InventoryRepository, useValue: mockRepository },
        { provide: PrismaService, useValue: mockPrisma },
        { provide: NotificationsService, useValue: mockNotificationsService },
      ],
    }).compile();

    service = module.get<InventoryService>(InventoryService);
    repository = module.get(InventoryRepository);
    prisma = module.get(PrismaService);
    notificationsService = module.get(NotificationsService);
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return paginated movements', async () => {
      mockRepository.findAll.mockResolvedValue({ data: [], meta: {} as any });
      const result = await service.findAll({});
      expect(result.data).toEqual([]);
      expect(repository.findAll).toHaveBeenCalledWith({});
    });
  });

  describe('findById', () => {
    it('should find by id', async () => {
      mockRepository.findById.mockResolvedValue({ id: '1' } as any);
      const res = await service.findById('1');
      expect(res).toEqual({ id: '1' });
    });
  });

  describe('getLowStockSupplies', () => {
    it('should return low stock supplies raw', async () => {
      mockRepository.getLowStockSuppliesRaw.mockResolvedValue([{ id: '1' }] as any);
      const res = await service.getLowStockSupplies();
      expect(res).toEqual([{ id: '1' }]);
    });
  });

  describe('getInventoryValuation', () => {
    it('should return valuation', async () => {
      mockRepository.getInventoryValuation.mockResolvedValue([{ supply_id: '1' }] as any);
      const res = await service.getInventoryValuation();
      expect(res).toEqual([{ supply_id: '1' }]);
    });
  });

  describe('createManualMovement', () => {
    it('should throw BadRequestException if type is EXIT', async () => {
      await expect(
        service.createManualMovement({ type: InventoryMovementType.EXIT } as any, 'user-1')
      ).rejects.toThrow(BadRequestException);
    });

    it('should call createMovement with manual fields', async () => {
      const dto = { type: InventoryMovementType.ENTRY, supplyId: 's1', quantity: 10 } as any;
      jest.spyOn(service, 'createMovement').mockResolvedValue({ id: 'm1' } as any);

      const res = await service.createManualMovement(dto, 'user-1');

      expect(res).toEqual({ id: 'm1' });
      expect(service.createMovement).toHaveBeenCalledWith(dto, 'user-1');
    });
  });

  describe('createExitFromWorkOrder', () => {
    it('should perform work order exits within a transaction', async () => {
      mockPrisma.workOrderItemSupply.findMany.mockResolvedValue([
        { supplyId: 's1', quantity: '10', supply: { currentStock: '20', minimumStock: '5' } }
      ] as any);
      
      await service.createExitFromWorkOrder('order-1', 'user-1', mockPrisma as any);

      expect(mockPrisma.inventoryMovement.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            supplyId: 's1',
            type: InventoryMovementType.EXIT,
            referenceType: 'WORK_ORDER',
            referenceId: 'order-1',
          }),
        })
      );
    });
  });

  describe('checkAndNotifyAllLowStock', () => {
    it('should query low stock, optionally send notifications, and log', async () => {
      mockRepository.getLowStockSuppliesRaw.mockResolvedValue([
        { id: '1', name: 'Supply 1', current_stock: 5, minimum_stock: 10 } as any,
      ]);
      mockNotificationsService.notifyUsersWithPermission.mockResolvedValue(1);

      const res = await service.checkAndNotifyAllLowStock();

      expect(res).toBe(1); 
      expect(mockNotificationsService.notifyUsersWithPermission).toHaveBeenCalled();
    });

    it('should do nothing if no low stock supplies exist', async () => {
      mockRepository.getLowStockSuppliesRaw.mockResolvedValue([]);
      const res = await service.checkAndNotifyAllLowStock();
      expect(res).toBe(0);
      expect(mockNotificationsService.notifyUsersWithPermission).not.toHaveBeenCalled();
    });
  });

  describe('createMovement', () => {
    it('should throw an error if supply is not found', async () => {
      mockPrisma.supply.findUnique.mockResolvedValue(null);

      await expect(
        service.createMovement({ supplyId: 'inexistent', type: InventoryMovementType.ENTRY, quantity: 10 } as any, 'user-1')
      ).rejects.toThrow('Insumo con id inexistent no encontrado');
    });

    it('should properly update inventory on ENTRY', async () => {
      const dto = { supplyId: 's1', type: InventoryMovementType.ENTRY, quantity: 5 } as any;
      mockPrisma.supply.findUnique.mockResolvedValue({
        id: 's1', name: 'S1', currentStock: 10, minimumStock: 5, purchasePrice: 50, isActive: true,
      } as any);
      mockPrisma.supply.update.mockResolvedValue({ currentStock: 15 } as any);
      mockRepository.create.mockResolvedValue({ id: 'm1', newStock: 15 } as any);

      const res = await service.createMovement(dto, 'user-1');

      expect(res).toEqual({ id: 'm1', newStock: 15 });
      expect(mockPrisma.supply.update).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ currentStock: expect.any(Object) }) // Using Prisma.Decimal
      }));
      expect(mockRepository.create).toHaveBeenCalled();
    });

    it('should throw out of supply error if trying to EXIT above available stock', async () => {
      const dto = { supplyId: 's1', type: InventoryMovementType.EXIT, quantity: 15 } as any;
      mockPrisma.supply.findUnique.mockResolvedValue({
        id: 's1', name: 'S1', currentStock: 10, minimumStock: 5, purchasePrice: 50, isActive: true,
      } as any);

      await expect(
        service.createMovement(dto, 'user-1')
      ).rejects.toThrow('Stock insuficiente. Stock actual: 10, cantidad solicitada: 15');

      expect(mockPrisma.supply.update).not.toHaveBeenCalled();
    });

    it('should compute decreasing stock on EXIT', async () => {
      const dto = { supplyId: 's1', type: InventoryMovementType.EXIT, quantity: 5 } as any;
      mockPrisma.supply.findUnique.mockResolvedValue({
        id: 's1', name: 'S1', currentStock: 10, minimumStock: 5, purchasePrice: 50, isActive: true,
      } as any);
      mockPrisma.supply.update.mockResolvedValue({ currentStock: 5 } as any);
      mockRepository.create.mockResolvedValue({ id: 'm-exit' } as any);

      const res = await service.createMovement(dto, 'user-1');
      
      expect(res).toEqual({ id: 'm-exit' });
      expect(mockPrisma.supply.update).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ currentStock: expect.any(Object) })
      }));
    });
  });
});
