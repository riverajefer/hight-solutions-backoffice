import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { AreasService } from './areas.service';
import { AreasRepository } from './areas.repository';

const mockAreasRepository = {
  findAll: jest.fn(),
  findById: jest.fn(),
  findByName: jest.fn(),
  findByNameExcludingId: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  countActiveCargos: jest.fn(),
  delete: jest.fn(),
};

describe('AreasService', () => {
  let service: AreasService;

  // Fixture: área como la devuelve findAll (con _count)
  const mockAreaFromFindAll = {
    id: 'area-1',
    name: 'Desarrollo',
    description: 'Área de desarrollo de software',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    _count: { cargos: 3 },
  };

  // Fixture: área como la devuelve findById (con cargos anidados)
  const mockAreaFromFindById = {
    id: 'area-1',
    name: 'Desarrollo',
    description: 'Área de desarrollo de software',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    cargos: [
      {
        id: 'cargo-1',
        name: 'Developer',
        isActive: true,
        _count: { users: 2 },
      },
      {
        id: 'cargo-2',
        name: 'Tech Lead',
        isActive: true,
        _count: { users: 1 },
      },
    ],
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AreasService,
        { provide: AreasRepository, useValue: mockAreasRepository },
      ],
    }).compile();

    service = module.get<AreasService>(AreasService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ─────────────────────────────────────────────
  // findAll
  // ─────────────────────────────────────────────
  describe('findAll', () => {
    it('should return areas with cargosCount and without _count', async () => {
      mockAreasRepository.findAll.mockResolvedValue([mockAreaFromFindAll]);

      const result = await service.findAll();

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({ id: 'area-1', cargosCount: 3 });
      // El service hace `_count: undefined` vía spread — la clave existe pero con valor undefined
      expect(result[0]._count).toBeUndefined();
    });

    it('should pass includeInactive flag to repository', async () => {
      mockAreasRepository.findAll.mockResolvedValue([]);

      await service.findAll(true);

      expect(mockAreasRepository.findAll).toHaveBeenCalledWith(true);
    });

    it('should default to includeInactive=false', async () => {
      mockAreasRepository.findAll.mockResolvedValue([]);

      await service.findAll();

      expect(mockAreasRepository.findAll).toHaveBeenCalledWith(false);
    });

    it('should return empty array when no areas exist', async () => {
      mockAreasRepository.findAll.mockResolvedValue([]);

      const result = await service.findAll();

      expect(result).toEqual([]);
    });
  });

  // ─────────────────────────────────────────────
  // findOne
  // ─────────────────────────────────────────────
  describe('findOne', () => {
    it('should return area with cargos enriched with usersCount (no _count)', async () => {
      mockAreasRepository.findById.mockResolvedValue(mockAreaFromFindById);

      const result = await service.findOne('area-1');

      expect(result.id).toBe('area-1');
      expect(result.cargos).toHaveLength(2);
      expect(result.cargos[0]).toMatchObject({ id: 'cargo-1', usersCount: 2 });
      expect(result.cargos[0]._count).toBeUndefined();
      expect(result.cargos[1]).toMatchObject({ id: 'cargo-2', usersCount: 1 });
    });

    it('should throw NotFoundException when area does not exist', async () => {
      mockAreasRepository.findById.mockResolvedValue(null);

      await expect(service.findOne('bad-id')).rejects.toThrow(NotFoundException);
      await expect(service.findOne('bad-id')).rejects.toThrow(
        'Área con ID bad-id no encontrada',
      );
    });
  });

  // ─────────────────────────────────────────────
  // create
  // ─────────────────────────────────────────────
  describe('create', () => {
    const createDto = { name: 'Finanzas', description: 'Área de finanzas' };

    it('should create area when name is unique', async () => {
      mockAreasRepository.findByName.mockResolvedValue(null);
      mockAreasRepository.create.mockResolvedValue({ id: 'new-area', ...createDto });

      await service.create(createDto);

      expect(mockAreasRepository.create).toHaveBeenCalledWith({
        name: createDto.name,
        description: createDto.description,
      });
    });

    it('should throw BadRequestException when area name already exists', async () => {
      mockAreasRepository.findByName.mockResolvedValue({ id: 'existing' });

      await expect(service.create(createDto)).rejects.toThrow(BadRequestException);
      await expect(service.create(createDto)).rejects.toThrow(
        `Ya existe un área con el nombre "${createDto.name}"`,
      );
      expect(mockAreasRepository.create).not.toHaveBeenCalled();
    });
  });

  // ─────────────────────────────────────────────
  // update
  // ─────────────────────────────────────────────
  describe('update', () => {
    beforeEach(() => {
      mockAreasRepository.findById.mockResolvedValue(mockAreaFromFindById);
      mockAreasRepository.findByNameExcludingId.mockResolvedValue(null);
      mockAreasRepository.update.mockResolvedValue({ ...mockAreaFromFindById });
    });

    it('should update area and return result from repository', async () => {
      await service.update('area-1', { description: 'Nueva descripción' });

      expect(mockAreasRepository.update).toHaveBeenCalledWith('area-1', {
        description: 'Nueva descripción',
      });
    });

    it('should throw NotFoundException when area does not exist', async () => {
      mockAreasRepository.findById.mockResolvedValue(null);

      await expect(service.update('bad-id', { name: 'x' })).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when new name is already used by another area', async () => {
      mockAreasRepository.findByNameExcludingId.mockResolvedValue({ id: 'other-area' });

      await expect(service.update('area-1', { name: 'Finanzas' })).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.update('area-1', { name: 'Finanzas' })).rejects.toThrow(
        `Ya existe un área con el nombre "Finanzas"`,
      );
    });

    it('should not check name uniqueness when name is not being updated', async () => {
      await service.update('area-1', { description: 'Solo descripción' });

      expect(mockAreasRepository.findByNameExcludingId).not.toHaveBeenCalled();
    });
  });

  // ─────────────────────────────────────────────
  // remove (soft delete)
  // ─────────────────────────────────────────────
  describe('remove', () => {
    it('should soft-delete area (isActive=false) and return success message', async () => {
      mockAreasRepository.findById.mockResolvedValue(mockAreaFromFindById);
      mockAreasRepository.countActiveCargos.mockResolvedValue(0);
      mockAreasRepository.update.mockResolvedValue({});

      const result = await service.remove('area-1');

      expect(mockAreasRepository.update).toHaveBeenCalledWith('area-1', { isActive: false });
      expect(result).toEqual({ message: 'Área con ID area-1 eliminada correctamente' });
    });

    it('should throw NotFoundException when area does not exist', async () => {
      mockAreasRepository.findById.mockResolvedValue(null);

      await expect(service.remove('bad-id')).rejects.toThrow(NotFoundException);
      expect(mockAreasRepository.countActiveCargos).not.toHaveBeenCalled();
      expect(mockAreasRepository.update).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when area has active cargos', async () => {
      mockAreasRepository.findById.mockResolvedValue(mockAreaFromFindById);
      mockAreasRepository.countActiveCargos.mockResolvedValue(2);

      await expect(service.remove('area-1')).rejects.toThrow(BadRequestException);
      await expect(service.remove('area-1')).rejects.toThrow(
        'No se puede eliminar el área porque tiene 2 cargo(s) activo(s)',
      );
      expect(mockAreasRepository.update).not.toHaveBeenCalled();
    });
  });
});
