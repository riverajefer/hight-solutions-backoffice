import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { ProductionAreasService } from './production-areas.service';
import { ProductionAreasRepository } from './production-areas.repository';

const mockProductionAreasRepository = {
  findAll: jest.fn(),
  findById: jest.fn(),
  findByName: jest.fn(),
  findByNameExcludingId: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
};

describe('ProductionAreasService', () => {
  let service: ProductionAreasService;

  const mockProductionArea = {
    id: 'pa-1',
    name: 'Corte',
    description: 'Área de corte de materiales',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductionAreasService,
        { provide: ProductionAreasRepository, useValue: mockProductionAreasRepository },
      ],
    }).compile();

    service = module.get<ProductionAreasService>(ProductionAreasService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ─────────────────────────────────────────────
  // findAll
  // ─────────────────────────────────────────────
  describe('findAll', () => {
    it('should delegate to repository with includeInactive=false by default', async () => {
      mockProductionAreasRepository.findAll.mockResolvedValue([mockProductionArea]);

      const result = await service.findAll();

      expect(mockProductionAreasRepository.findAll).toHaveBeenCalledWith(false);
      expect(result).toEqual([mockProductionArea]);
    });

    it('should pass includeInactive=true to repository when requested', async () => {
      mockProductionAreasRepository.findAll.mockResolvedValue([]);

      await service.findAll(true);

      expect(mockProductionAreasRepository.findAll).toHaveBeenCalledWith(true);
    });
  });

  // ─────────────────────────────────────────────
  // findOne
  // ─────────────────────────────────────────────
  describe('findOne', () => {
    it('should return production area when found', async () => {
      mockProductionAreasRepository.findById.mockResolvedValue(mockProductionArea);

      const result = await service.findOne('pa-1');

      expect(result).toEqual(mockProductionArea);
    });

    it('should throw NotFoundException when area does not exist', async () => {
      mockProductionAreasRepository.findById.mockResolvedValue(null);

      await expect(service.findOne('bad-id')).rejects.toThrow(NotFoundException);
      await expect(service.findOne('bad-id')).rejects.toThrow(
        'Área de producción con ID bad-id no encontrada',
      );
    });
  });

  // ─────────────────────────────────────────────
  // create
  // ─────────────────────────────────────────────
  describe('create', () => {
    const createDto = { name: 'Corte', description: 'Área de corte' };

    it('should create production area when name is unique', async () => {
      mockProductionAreasRepository.findByName.mockResolvedValue(null);
      mockProductionAreasRepository.create.mockResolvedValue(mockProductionArea);

      await service.create(createDto);

      expect(mockProductionAreasRepository.create).toHaveBeenCalledWith({
        name: createDto.name,
        description: createDto.description,
      });
    });

    it('should throw BadRequestException when name already exists', async () => {
      mockProductionAreasRepository.findByName.mockResolvedValue({ id: 'existing' });

      await expect(service.create(createDto)).rejects.toThrow(BadRequestException);
      await expect(service.create(createDto)).rejects.toThrow(
        `Ya existe un área de producción con el nombre "${createDto.name}"`,
      );
      expect(mockProductionAreasRepository.create).not.toHaveBeenCalled();
    });
  });

  // ─────────────────────────────────────────────
  // update
  // ─────────────────────────────────────────────
  describe('update', () => {
    beforeEach(() => {
      mockProductionAreasRepository.findById.mockResolvedValue(mockProductionArea);
      mockProductionAreasRepository.findByNameExcludingId.mockResolvedValue(null);
      mockProductionAreasRepository.update.mockResolvedValue({
        ...mockProductionArea,
        name: 'Ensamblaje',
      });
    });

    it('should update production area and return result', async () => {
      const result = await service.update('pa-1', { name: 'Ensamblaje' });

      expect(mockProductionAreasRepository.update).toHaveBeenCalledWith('pa-1', {
        name: 'Ensamblaje',
      });
      expect(result).toMatchObject({ name: 'Ensamblaje' });
    });

    it('should throw NotFoundException when area does not exist', async () => {
      mockProductionAreasRepository.findById.mockResolvedValue(null);

      await expect(service.update('bad-id', { name: 'x' })).rejects.toThrow(NotFoundException);
      expect(mockProductionAreasRepository.update).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when new name is already used by another area', async () => {
      mockProductionAreasRepository.findByNameExcludingId.mockResolvedValue({ id: 'other-pa' });

      await expect(service.update('pa-1', { name: 'Taken' })).rejects.toThrow(BadRequestException);
      await expect(service.update('pa-1', { name: 'Taken' })).rejects.toThrow(
        `Ya existe un área de producción con el nombre "Taken"`,
      );
      expect(mockProductionAreasRepository.update).not.toHaveBeenCalled();
    });

    it('should not check name uniqueness when name is not being updated', async () => {
      await service.update('pa-1', { description: 'Nueva descripción' });

      expect(mockProductionAreasRepository.findByNameExcludingId).not.toHaveBeenCalled();
      expect(mockProductionAreasRepository.update).toHaveBeenCalledWith(
        'pa-1',
        { description: 'Nueva descripción' },
      );
    });
  });

  // ─────────────────────────────────────────────
  // remove (soft delete)
  // ─────────────────────────────────────────────
  describe('remove', () => {
    it('should soft-delete area (isActive=false) and return success message', async () => {
      mockProductionAreasRepository.findById.mockResolvedValue(mockProductionArea);
      mockProductionAreasRepository.update.mockResolvedValue({});

      const result = await service.remove('pa-1');

      expect(mockProductionAreasRepository.update).toHaveBeenCalledWith('pa-1', {
        isActive: false,
      });
      expect(result).toEqual({
        message: 'Área de producción con ID pa-1 eliminada correctamente',
      });
    });

    it('should throw NotFoundException when area does not exist', async () => {
      mockProductionAreasRepository.findById.mockResolvedValue(null);

      await expect(service.remove('bad-id')).rejects.toThrow(NotFoundException);
      expect(mockProductionAreasRepository.update).not.toHaveBeenCalled();
    });
  });
});
