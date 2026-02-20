import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { SuppliesService } from './supplies.service';
import { SuppliesRepository } from './supplies.repository';
import { Prisma } from '../../../generated/prisma';

const mockSuppliesRepository = {
  findAll: jest.fn(),
  findById: jest.fn(),
  findBySku: jest.fn(),
  findBySkuExcludingId: jest.fn(),
  findByNameAndCategory: jest.fn(),
  findByNameAndCategoryExcludingId: jest.fn(),
  findLowStock: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
};

describe('SuppliesService', () => {
  let service: SuppliesService;

  const mockSupply = {
    id: 'supply-1',
    name: 'Pintura Blanca',
    sku: 'PB-001',
    description: 'Pintura látex blanca',
    categoryId: 'scat-1',
    purchasePrice: new Prisma.Decimal('25.00'),
    purchaseUnitId: 'unit-1',
    consumptionUnitId: 'unit-2',
    conversionFactor: new Prisma.Decimal('1'),
    currentStock: new Prisma.Decimal('10'),
    minimumStock: new Prisma.Decimal('5'),
    isActive: true,
    category: { id: 'scat-1', name: 'Pinturas' },
    purchaseUnit: { id: 'unit-1', name: 'Galón', abbreviation: 'gal' },
    consumptionUnit: { id: 'unit-2', name: 'Litro', abbreviation: 'L' },
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SuppliesService,
        { provide: SuppliesRepository, useValue: mockSuppliesRepository },
      ],
    }).compile();

    service = module.get<SuppliesService>(SuppliesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ─────────────────────────────────────────────
  // findAll
  // ─────────────────────────────────────────────
  describe('findAll', () => {
    it('should delegate to repository with includeInactive=false by default', async () => {
      mockSuppliesRepository.findAll.mockResolvedValue([mockSupply]);

      const result = await service.findAll();

      expect(mockSuppliesRepository.findAll).toHaveBeenCalledWith(false, undefined);
      expect(result).toEqual([mockSupply]);
    });

    it('should pass includeInactive=true to repository when requested', async () => {
      mockSuppliesRepository.findAll.mockResolvedValue([]);

      await service.findAll(true);

      expect(mockSuppliesRepository.findAll).toHaveBeenCalledWith(true, undefined);
    });

    it('should pass categoryId filter to repository when provided', async () => {
      mockSuppliesRepository.findAll.mockResolvedValue([mockSupply]);

      await service.findAll(false, 'scat-1');

      expect(mockSuppliesRepository.findAll).toHaveBeenCalledWith(false, 'scat-1');
    });
  });

  // ─────────────────────────────────────────────
  // findOne
  // ─────────────────────────────────────────────
  describe('findOne', () => {
    it('should return supply when found', async () => {
      mockSuppliesRepository.findById.mockResolvedValue(mockSupply);

      const result = await service.findOne('supply-1');

      expect(result).toEqual(mockSupply);
    });

    it('should throw NotFoundException when supply does not exist', async () => {
      mockSuppliesRepository.findById.mockResolvedValue(null);

      await expect(service.findOne('bad-id')).rejects.toThrow(NotFoundException);
      await expect(service.findOne('bad-id')).rejects.toThrow(
        'Insumo con ID bad-id no encontrado',
      );
    });
  });

  // ─────────────────────────────────────────────
  // findLowStock
  // ─────────────────────────────────────────────
  describe('findLowStock', () => {
    it('should delegate to repository.findLowStock and return results', async () => {
      const lowStockItems = [{ ...mockSupply, currentStock: new Prisma.Decimal('2') }];
      mockSuppliesRepository.findLowStock.mockResolvedValue(lowStockItems);

      const result = await service.findLowStock();

      expect(mockSuppliesRepository.findLowStock).toHaveBeenCalledTimes(1);
      expect(result).toEqual(lowStockItems);
    });

    it('should return empty array when no supplies are below minimum stock', async () => {
      mockSuppliesRepository.findLowStock.mockResolvedValue([]);

      const result = await service.findLowStock();

      expect(result).toEqual([]);
    });
  });

  // ─────────────────────────────────────────────
  // create
  // ─────────────────────────────────────────────
  describe('create', () => {
    const createDto = {
      name: 'Pintura Blanca',
      sku: 'PB-001',
      description: 'Pintura látex blanca',
      categoryId: 'scat-1',
      purchasePrice: 25,
      purchaseUnitId: 'unit-1',
      consumptionUnitId: 'unit-2',
      conversionFactor: 4,
      currentStock: 10,
      minimumStock: 5,
    };

    beforeEach(() => {
      mockSuppliesRepository.findBySku.mockResolvedValue(null);
      mockSuppliesRepository.findByNameAndCategory.mockResolvedValue(null);
      mockSuppliesRepository.create.mockResolvedValue(mockSupply);
    });

    it('should throw BadRequestException when SKU already exists', async () => {
      mockSuppliesRepository.findBySku.mockResolvedValue({ id: 'other' });

      await expect(service.create(createDto)).rejects.toThrow(BadRequestException);
      await expect(service.create(createDto)).rejects.toThrow(
        `Ya existe un insumo con el SKU "${createDto.sku}"`,
      );
      expect(mockSuppliesRepository.create).not.toHaveBeenCalled();
    });

    it('should not check SKU uniqueness when sku is not provided', async () => {
      const { sku: _, ...dtoWithoutSku } = createDto;
      await service.create(dtoWithoutSku as any);

      expect(mockSuppliesRepository.findBySku).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when name already exists in the same category', async () => {
      mockSuppliesRepository.findByNameAndCategory.mockResolvedValue({ id: 'other' });

      await expect(service.create(createDto)).rejects.toThrow(BadRequestException);
      await expect(service.create(createDto)).rejects.toThrow(
        `Ya existe un insumo con el nombre "${createDto.name}" en esta categoría`,
      );
      expect(mockSuppliesRepository.create).not.toHaveBeenCalled();
    });

    it('should convert purchasePrice to Prisma.Decimal when provided', async () => {
      await service.create(createDto);

      const callArg = mockSuppliesRepository.create.mock.calls[0][0];
      expect(callArg.purchasePrice).toBeInstanceOf(Prisma.Decimal);
      expect(Number(callArg.purchasePrice.toString())).toBe(25);
    });

    it('should set purchasePrice to null when not provided', async () => {
      const { purchasePrice: _, ...dtoWithoutPrice } = createDto;
      await service.create(dtoWithoutPrice as any);

      const callArg = mockSuppliesRepository.create.mock.calls[0][0];
      expect(callArg.purchasePrice).toBeNull();
    });

    it('should convert conversionFactor to Prisma.Decimal when provided', async () => {
      await service.create(createDto);

      const callArg = mockSuppliesRepository.create.mock.calls[0][0];
      expect(callArg.conversionFactor).toBeInstanceOf(Prisma.Decimal);
      expect(Number(callArg.conversionFactor.toString())).toBe(4);
    });

    it('should default conversionFactor to Decimal(1) when not provided', async () => {
      const { conversionFactor: _, ...dtoWithoutFactor } = createDto;
      await service.create(dtoWithoutFactor as any);

      const callArg = mockSuppliesRepository.create.mock.calls[0][0];
      expect(Number(callArg.conversionFactor.toString())).toBe(1);
    });

    it('should convert currentStock to Prisma.Decimal when provided', async () => {
      await service.create(createDto);

      const callArg = mockSuppliesRepository.create.mock.calls[0][0];
      expect(callArg.currentStock).toBeInstanceOf(Prisma.Decimal);
      expect(Number(callArg.currentStock.toString())).toBe(10);
    });

    it('should default currentStock to Decimal(0) when not provided', async () => {
      const { currentStock: _, ...dtoWithoutStock } = createDto;
      await service.create(dtoWithoutStock as any);

      const callArg = mockSuppliesRepository.create.mock.calls[0][0];
      expect(Number(callArg.currentStock.toString())).toBe(0);
    });

    it('should convert minimumStock to Prisma.Decimal when provided', async () => {
      await service.create(createDto);

      const callArg = mockSuppliesRepository.create.mock.calls[0][0];
      expect(callArg.minimumStock).toBeInstanceOf(Prisma.Decimal);
      expect(Number(callArg.minimumStock.toString())).toBe(5);
    });

    it('should default minimumStock to Decimal(0) when not provided', async () => {
      const { minimumStock: _, ...dtoWithoutMin } = createDto;
      await service.create(dtoWithoutMin as any);

      const callArg = mockSuppliesRepository.create.mock.calls[0][0];
      expect(Number(callArg.minimumStock.toString())).toBe(0);
    });

    it('should connect category, purchaseUnit and consumptionUnit via relations', async () => {
      await service.create(createDto);

      expect(mockSuppliesRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          category: { connect: { id: 'scat-1' } },
          purchaseUnit: { connect: { id: 'unit-1' } },
          consumptionUnit: { connect: { id: 'unit-2' } },
        }),
      );
    });

    it('should return the created supply', async () => {
      const result = await service.create(createDto);

      expect(result).toEqual(mockSupply);
    });
  });

  // ─────────────────────────────────────────────
  // update
  // ─────────────────────────────────────────────
  describe('update', () => {
    beforeEach(() => {
      mockSuppliesRepository.findById.mockResolvedValue(mockSupply);
      mockSuppliesRepository.findBySkuExcludingId.mockResolvedValue(null);
      mockSuppliesRepository.findByNameAndCategoryExcludingId.mockResolvedValue(null);
      mockSuppliesRepository.update.mockResolvedValue({
        ...mockSupply,
        description: 'Updated',
      });
    });

    it('should throw NotFoundException when supply does not exist', async () => {
      mockSuppliesRepository.findById.mockResolvedValue(null);

      await expect(service.update('bad-id', { name: 'x' })).rejects.toThrow(NotFoundException);
      expect(mockSuppliesRepository.update).not.toHaveBeenCalled();
    });

    it('should update supply and return result', async () => {
      const result = await service.update('supply-1', { description: 'Updated' });

      expect(mockSuppliesRepository.update).toHaveBeenCalledWith(
        'supply-1',
        expect.objectContaining({ description: 'Updated' }),
      );
      expect(result).toMatchObject({ id: 'supply-1' });
    });

    it('should throw BadRequestException when new SKU is already used by another supply', async () => {
      mockSuppliesRepository.findBySkuExcludingId.mockResolvedValue({ id: 'other' });

      await expect(service.update('supply-1', { sku: 'TAKEN-001' })).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.update('supply-1', { sku: 'TAKEN-001' })).rejects.toThrow(
        'Ya existe un insumo con el SKU "TAKEN-001"',
      );
    });

    it('should not check SKU uniqueness when sku is not being updated', async () => {
      await service.update('supply-1', { description: 'Only description' });

      expect(mockSuppliesRepository.findBySkuExcludingId).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when name is already used in the same category', async () => {
      mockSuppliesRepository.findByNameAndCategoryExcludingId.mockResolvedValue({ id: 'other' });

      await expect(service.update('supply-1', { name: 'Pintura Blanca' })).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.update('supply-1', { name: 'Pintura Blanca' })).rejects.toThrow(
        'en esta categoría',
      );
    });

    it('should check per-category uniqueness using current category when only name changes', async () => {
      await service.update('supply-1', { name: 'Nuevo Nombre' });

      expect(mockSuppliesRepository.findByNameAndCategoryExcludingId).toHaveBeenCalledWith(
        'Nuevo Nombre',
        'scat-1', // current category from mockSupply
        'supply-1',
      );
    });

    it('should not check name/category uniqueness when neither name nor categoryId is updated', async () => {
      await service.update('supply-1', { description: 'Only description' });

      expect(mockSuppliesRepository.findByNameAndCategoryExcludingId).not.toHaveBeenCalled();
    });

    it('should convert purchasePrice to Decimal when updating', async () => {
      await service.update('supply-1', { purchasePrice: 30 });

      const callArg = mockSuppliesRepository.update.mock.calls[0][1];
      expect(callArg.purchasePrice).toBeInstanceOf(Prisma.Decimal);
      expect(Number(callArg.purchasePrice.toString())).toBe(30);
    });

    it('should set purchasePrice to null when updating with null', async () => {
      await service.update('supply-1', { purchasePrice: null as any });

      const callArg = mockSuppliesRepository.update.mock.calls[0][1];
      expect(callArg.purchasePrice).toBeNull();
    });

    it('should convert conversionFactor to Decimal when updating', async () => {
      await service.update('supply-1', { conversionFactor: 3.78 });

      const callArg = mockSuppliesRepository.update.mock.calls[0][1];
      expect(callArg.conversionFactor).toBeInstanceOf(Prisma.Decimal);
      expect(Number(callArg.conversionFactor.toString())).toBeCloseTo(3.78);
    });

    it('should convert currentStock to Decimal when updating', async () => {
      await service.update('supply-1', { currentStock: 20 });

      const callArg = mockSuppliesRepository.update.mock.calls[0][1];
      expect(callArg.currentStock).toBeInstanceOf(Prisma.Decimal);
      expect(Number(callArg.currentStock.toString())).toBe(20);
    });

    it('should convert minimumStock to Decimal when updating', async () => {
      await service.update('supply-1', { minimumStock: 3 });

      const callArg = mockSuppliesRepository.update.mock.calls[0][1];
      expect(callArg.minimumStock).toBeInstanceOf(Prisma.Decimal);
      expect(Number(callArg.minimumStock.toString())).toBe(3);
    });

    it('should connect category via relation when categoryId is updated', async () => {
      await service.update('supply-1', { categoryId: 'scat-2' });

      const callArg = mockSuppliesRepository.update.mock.calls[0][1];
      expect(callArg.category).toEqual({ connect: { id: 'scat-2' } });
    });

    it('should connect purchaseUnit via relation when purchaseUnitId is updated', async () => {
      await service.update('supply-1', { purchaseUnitId: 'unit-3' });

      const callArg = mockSuppliesRepository.update.mock.calls[0][1];
      expect(callArg.purchaseUnit).toEqual({ connect: { id: 'unit-3' } });
    });

    it('should connect consumptionUnit via relation when consumptionUnitId is updated', async () => {
      await service.update('supply-1', { consumptionUnitId: 'unit-4' });

      const callArg = mockSuppliesRepository.update.mock.calls[0][1];
      expect(callArg.consumptionUnit).toEqual({ connect: { id: 'unit-4' } });
    });
  });

  // ─────────────────────────────────────────────
  // remove (soft delete)
  // ─────────────────────────────────────────────
  describe('remove', () => {
    it('should soft-delete supply (isActive=false) and return success message', async () => {
      mockSuppliesRepository.findById.mockResolvedValue(mockSupply);
      mockSuppliesRepository.update.mockResolvedValue({});

      const result = await service.remove('supply-1');

      expect(mockSuppliesRepository.update).toHaveBeenCalledWith('supply-1', {
        isActive: false,
      });
      expect(result).toEqual({
        message: 'Insumo con ID supply-1 eliminado correctamente',
      });
    });

    it('should throw NotFoundException when supply does not exist', async () => {
      mockSuppliesRepository.findById.mockResolvedValue(null);

      await expect(service.remove('bad-id')).rejects.toThrow(NotFoundException);
      expect(mockSuppliesRepository.update).not.toHaveBeenCalled();
    });
  });
});
