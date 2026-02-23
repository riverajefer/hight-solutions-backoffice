import { Test, TestingModule } from '@nestjs/testing';
import { SuppliesController } from './supplies.controller';
import { SuppliesService } from './supplies.service';
import { JwtAuthGuard } from '../../auth/guards';
import { PermissionsGuard } from '../../../common/guards';

const mockSuppliesService = {
  findAll: jest.fn(),
  findLowStock: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
};

const mockSupply = {
  id: 'supply-1',
  name: 'Hilo Azul',
  sku: 'HI-001',
  stock: 50,
  minStock: 10,
  isActive: true,
};

describe('SuppliesController', () => {
  let controller: SuppliesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SuppliesController],
      providers: [{ provide: SuppliesService, useValue: mockSuppliesService }],
    })
      .overrideGuard(JwtAuthGuard).useValue({ canActivate: () => true })
      .overrideGuard(PermissionsGuard).useValue({ canActivate: () => true })
      .compile();

    controller = module.get<SuppliesController>(SuppliesController);
  });

  afterEach(() => jest.clearAllMocks());

  describe('findAll', () => {
    it('should delegate with includeInactive=false and no categoryId by default', async () => {
      mockSuppliesService.findAll.mockResolvedValue([mockSupply]);

      await controller.findAll(undefined, undefined);

      expect(mockSuppliesService.findAll).toHaveBeenCalledWith(false, undefined);
    });

    it('should pass includeInactive=true when param is "true"', async () => {
      mockSuppliesService.findAll.mockResolvedValue([mockSupply]);

      await controller.findAll('true', undefined);

      expect(mockSuppliesService.findAll).toHaveBeenCalledWith(true, undefined);
    });

    it('should pass categoryId filter when provided', async () => {
      mockSuppliesService.findAll.mockResolvedValue([mockSupply]);

      await controller.findAll(undefined, 'cat-1');

      expect(mockSuppliesService.findAll).toHaveBeenCalledWith(false, 'cat-1');
    });

    it('should pass both filters when both are provided', async () => {
      mockSuppliesService.findAll.mockResolvedValue([mockSupply]);

      await controller.findAll('true', 'cat-1');

      expect(mockSuppliesService.findAll).toHaveBeenCalledWith(true, 'cat-1');
    });
  });

  describe('findLowStock', () => {
    it('should delegate to suppliesService.findLowStock', async () => {
      const lowStockSupply = { ...mockSupply, stock: 5 };
      mockSuppliesService.findLowStock.mockResolvedValue([lowStockSupply]);

      const result = await controller.findLowStock();

      expect(mockSuppliesService.findLowStock).toHaveBeenCalledTimes(1);
      expect(result).toHaveLength(1);
    });
  });

  describe('findOne', () => {
    it('should delegate to suppliesService.findOne with id', async () => {
      mockSuppliesService.findOne.mockResolvedValue(mockSupply);

      const result = await controller.findOne('supply-1');

      expect(mockSuppliesService.findOne).toHaveBeenCalledWith('supply-1');
      expect(result).toEqual(mockSupply);
    });
  });

  describe('create', () => {
    it('should delegate to suppliesService.create with dto', async () => {
      const dto = { name: 'Tela Roja', sku: 'TR-001' } as any;
      mockSuppliesService.create.mockResolvedValue({ id: 'supply-2', ...dto });

      const result = await controller.create(dto);

      expect(mockSuppliesService.create).toHaveBeenCalledWith(dto);
      expect(result).toMatchObject({ name: 'Tela Roja' });
    });
  });

  describe('update', () => {
    it('should delegate to suppliesService.update with id and dto', async () => {
      const dto = { name: 'Hilo Rojo' } as any;
      mockSuppliesService.update.mockResolvedValue({ ...mockSupply, ...dto });

      await controller.update('supply-1', dto);

      expect(mockSuppliesService.update).toHaveBeenCalledWith('supply-1', dto);
    });
  });

  describe('remove', () => {
    it('should delegate to suppliesService.remove with id', async () => {
      mockSuppliesService.remove.mockResolvedValue({ ...mockSupply, isActive: false });

      await controller.remove('supply-1');

      expect(mockSuppliesService.remove).toHaveBeenCalledWith('supply-1');
    });
  });
});
