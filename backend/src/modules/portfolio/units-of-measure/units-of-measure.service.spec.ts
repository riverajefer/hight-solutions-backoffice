import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { UnitsOfMeasureService } from './units-of-measure.service';
import { UnitsOfMeasureRepository } from './units-of-measure.repository';

const mockUnitsOfMeasureRepository = {
  findAll: jest.fn(),
  findById: jest.fn(),
  findByName: jest.fn(),
  findByNameExcludingId: jest.fn(),
  findByAbbreviation: jest.fn(),
  findByAbbreviationExcludingId: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
};

describe('UnitsOfMeasureService', () => {
  let service: UnitsOfMeasureService;

  const mockUnit = {
    id: 'unit-1',
    name: 'Kilogramo',
    abbreviation: 'kg',
    description: 'Unidad de masa',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UnitsOfMeasureService,
        { provide: UnitsOfMeasureRepository, useValue: mockUnitsOfMeasureRepository },
      ],
    }).compile();

    service = module.get<UnitsOfMeasureService>(UnitsOfMeasureService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ─────────────────────────────────────────────
  // findAll
  // ─────────────────────────────────────────────
  describe('findAll', () => {
    it('should delegate to repository with includeInactive=false by default', async () => {
      mockUnitsOfMeasureRepository.findAll.mockResolvedValue([mockUnit]);

      const result = await service.findAll();

      expect(mockUnitsOfMeasureRepository.findAll).toHaveBeenCalledWith(false);
      expect(result).toEqual([mockUnit]);
    });

    it('should pass includeInactive=true to repository when requested', async () => {
      mockUnitsOfMeasureRepository.findAll.mockResolvedValue([mockUnit]);

      await service.findAll(true);

      expect(mockUnitsOfMeasureRepository.findAll).toHaveBeenCalledWith(true);
    });

    it('should return empty array when no units exist', async () => {
      mockUnitsOfMeasureRepository.findAll.mockResolvedValue([]);

      const result = await service.findAll();

      expect(result).toEqual([]);
    });
  });

  // ─────────────────────────────────────────────
  // findOne
  // ─────────────────────────────────────────────
  describe('findOne', () => {
    it('should return unit when found', async () => {
      mockUnitsOfMeasureRepository.findById.mockResolvedValue(mockUnit);

      const result = await service.findOne('unit-1');

      expect(result).toEqual(mockUnit);
    });

    it('should throw NotFoundException when unit does not exist', async () => {
      mockUnitsOfMeasureRepository.findById.mockResolvedValue(null);

      await expect(service.findOne('bad-id')).rejects.toThrow(NotFoundException);
      await expect(service.findOne('bad-id')).rejects.toThrow(
        'Unidad de medida con ID bad-id no encontrada',
      );
    });
  });

  // ─────────────────────────────────────────────
  // create
  // ─────────────────────────────────────────────
  describe('create', () => {
    const createDto = {
      name: 'Kilogramo',
      abbreviation: 'kg',
      description: 'Unidad de masa',
    };

    beforeEach(() => {
      mockUnitsOfMeasureRepository.findByName.mockResolvedValue(null);
      mockUnitsOfMeasureRepository.findByAbbreviation.mockResolvedValue(null);
      mockUnitsOfMeasureRepository.create.mockResolvedValue(mockUnit);
    });

    it('should create unit with provided name and abbreviation', async () => {
      await service.create(createDto);

      expect(mockUnitsOfMeasureRepository.create).toHaveBeenCalledWith({
        name: 'Kilogramo',
        abbreviation: 'kg',
        description: 'Unidad de masa',
      });
    });

    it('should throw BadRequestException when name already exists', async () => {
      mockUnitsOfMeasureRepository.findByName.mockResolvedValue({ id: 'other' });

      await expect(service.create(createDto)).rejects.toThrow(BadRequestException);
      await expect(service.create(createDto)).rejects.toThrow(
        `Ya existe una unidad de medida con el nombre "${createDto.name}"`,
      );
      expect(mockUnitsOfMeasureRepository.create).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when abbreviation already exists', async () => {
      mockUnitsOfMeasureRepository.findByAbbreviation.mockResolvedValue({ id: 'other' });

      await expect(service.create(createDto)).rejects.toThrow(BadRequestException);
      await expect(service.create(createDto)).rejects.toThrow(
        `Ya existe una unidad de medida con la abreviatura "${createDto.abbreviation}"`,
      );
      expect(mockUnitsOfMeasureRepository.create).not.toHaveBeenCalled();
    });

    it('should return the created unit', async () => {
      const result = await service.create(createDto);

      expect(result).toEqual(mockUnit);
    });
  });

  // ─────────────────────────────────────────────
  // update
  // ─────────────────────────────────────────────
  describe('update', () => {
    beforeEach(() => {
      mockUnitsOfMeasureRepository.findById.mockResolvedValue(mockUnit);
      mockUnitsOfMeasureRepository.findByNameExcludingId.mockResolvedValue(null);
      mockUnitsOfMeasureRepository.findByAbbreviationExcludingId.mockResolvedValue(null);
      mockUnitsOfMeasureRepository.update.mockResolvedValue({ ...mockUnit, name: 'Gramo' });
    });

    it('should throw NotFoundException when unit does not exist', async () => {
      mockUnitsOfMeasureRepository.findById.mockResolvedValue(null);

      await expect(service.update('bad-id', { name: 'x' })).rejects.toThrow(NotFoundException);
      expect(mockUnitsOfMeasureRepository.update).not.toHaveBeenCalled();
    });

    it('should update unit and return result', async () => {
      await service.update('unit-1', { description: 'Nueva descripción' });

      expect(mockUnitsOfMeasureRepository.update).toHaveBeenCalledWith(
        'unit-1',
        { description: 'Nueva descripción' },
      );
    });

    it('should throw BadRequestException when new name is already used by another unit', async () => {
      mockUnitsOfMeasureRepository.findByNameExcludingId.mockResolvedValue({ id: 'other' });

      await expect(service.update('unit-1', { name: 'Gramo' })).rejects.toThrow(BadRequestException);
      await expect(service.update('unit-1', { name: 'Gramo' })).rejects.toThrow(
        'Ya existe una unidad de medida con el nombre "Gramo"',
      );
    });

    it('should throw BadRequestException when new abbreviation is already used by another unit', async () => {
      mockUnitsOfMeasureRepository.findByAbbreviationExcludingId.mockResolvedValue({ id: 'other' });

      await expect(service.update('unit-1', { abbreviation: 'g' })).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.update('unit-1', { abbreviation: 'g' })).rejects.toThrow(
        'Ya existe una unidad de medida con la abreviatura "g"',
      );
    });

    it('should not check name uniqueness when name is not being updated', async () => {
      await service.update('unit-1', { description: 'Only description' });

      expect(mockUnitsOfMeasureRepository.findByNameExcludingId).not.toHaveBeenCalled();
    });

    it('should not check abbreviation uniqueness when abbreviation is not being updated', async () => {
      await service.update('unit-1', { description: 'Only description' });

      expect(mockUnitsOfMeasureRepository.findByAbbreviationExcludingId).not.toHaveBeenCalled();
    });
  });

  // ─────────────────────────────────────────────
  // remove (soft delete)
  // ─────────────────────────────────────────────
  describe('remove', () => {
    it('should soft-delete unit (isActive=false) and return success message', async () => {
      mockUnitsOfMeasureRepository.findById.mockResolvedValue(mockUnit);
      mockUnitsOfMeasureRepository.update.mockResolvedValue({});

      const result = await service.remove('unit-1');

      expect(mockUnitsOfMeasureRepository.update).toHaveBeenCalledWith('unit-1', {
        isActive: false,
      });
      expect(result).toEqual({
        message: 'Unidad de medida con ID unit-1 eliminada correctamente',
      });
    });

    it('should throw NotFoundException when unit does not exist', async () => {
      mockUnitsOfMeasureRepository.findById.mockResolvedValue(null);

      await expect(service.remove('bad-id')).rejects.toThrow(NotFoundException);
      expect(mockUnitsOfMeasureRepository.update).not.toHaveBeenCalled();
    });
  });
});
