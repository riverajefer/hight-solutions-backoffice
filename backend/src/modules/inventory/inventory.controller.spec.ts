import { Test, TestingModule } from '@nestjs/testing';
import { InventoryController } from './inventory.controller';
import { InventoryService } from './inventory.service';
import { PermissionsGuard } from '../../common/guards';
import { JwtAuthGuard } from '../auth/guards';
import { AuthenticatedUser } from '../../common/interfaces';

describe('InventoryController', () => {
  let controller: InventoryController;
  let service: jest.Mocked<InventoryService>;

  const mockService = {
    findAll: jest.fn(),
    getLowStockSupplies: jest.fn(),
    getInventoryValuation: jest.fn(),
    findById: jest.fn(),
    createManualMovement: jest.fn(),
  };

  const mockUser: AuthenticatedUser = {
    id: 'user-id',
    email: 'test@test.com',
    username: 'testu',
    roleId: 'r1',
    role: { id: 'r1', name: 'USER' } as any,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [InventoryController],
      providers: [
        { provide: InventoryService, useValue: mockService },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .overrideGuard(PermissionsGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .compile();

    controller = module.get<InventoryController>(InventoryController);
    service = module.get<InventoryService>(InventoryService) as jest.Mocked<InventoryService>;
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('should call findAll on service', async () => {
      mockService.findAll.mockResolvedValue({ data: [], meta: {} });
      const filters = { page: 1 };
      const res = await controller.findAll(filters);
      expect(res).toEqual({ data: [], meta: {} });
      expect(service.findAll).toHaveBeenCalledWith(filters);
    });
  });

  describe('getLowStock', () => {
    it('should call getLowStockSupplies on service', async () => {
      mockService.getLowStockSupplies.mockResolvedValue([{ id: 's1' }]);
      const res = await controller.getLowStock();
      expect(res).toEqual([{ id: 's1' }]);
      expect(service.getLowStockSupplies).toHaveBeenCalled();
    });
  });

  describe('getValuation', () => {
    it('should call getInventoryValuation on service', async () => {
      mockService.getInventoryValuation.mockResolvedValue([{ supply_name: 's1' }]);
      const res = await controller.getValuation();
      expect(res).toEqual([{ supply_name: 's1' }]);
      expect(service.getInventoryValuation).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should call findById on service', async () => {
      mockService.findById.mockResolvedValue({ id: 'mov1' });
      const res = await controller.findOne('mov1');
      expect(res).toEqual({ id: 'mov1' });
      expect(service.findById).toHaveBeenCalledWith('mov1');
    });
  });

  describe('create', () => {
    it('should call createManualMovement on service', async () => {
      mockService.createManualMovement.mockResolvedValue({ id: 'newMov' });
      const dto = { supplyId: 's1', quantity: 10, type: 'ENTRY' } as any;
      const res = await controller.create(dto, mockUser);
      expect(res).toEqual({ id: 'newMov' });
      expect(service.createManualMovement).toHaveBeenCalledWith(dto, mockUser.id);
    });
  });
});
