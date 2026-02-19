import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { CargosService } from './cargos.service';
import { CargosRepository } from './cargos.repository';
import { AreasRepository } from '../areas/areas.repository';

const mockCargosRepository = {
  findAll: jest.fn(),
  findByArea: jest.fn(),
  findById: jest.fn(),
  findByNameAndArea: jest.fn(),
  findByNameAndAreaExcludingId: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  countUsers: jest.fn(),
  delete: jest.fn(),
};

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

describe('CargosService', () => {
  let service: CargosService;

  const mockActiveArea = {
    id: 'area-1',
    name: 'Desarrollo',
    isActive: true,
  };

  const mockInactiveArea = {
    id: 'area-2',
    name: 'Inactiva',
    isActive: false,
  };

  // Fixture: cargo como lo devuelve findById (con _count)
  const mockCargoFromRepo = {
    id: 'cargo-1',
    name: 'Developer',
    description: 'Desarrollador de software',
    isActive: true,
    areaId: 'area-1',
    createdAt: new Date(),
    updatedAt: new Date(),
    area: { id: 'area-1', name: 'Desarrollo' },
    _count: { users: 2 },
  };

  // Fixture: cargo de findAll (con _count)
  const mockCargoFromFindAll = {
    ...mockCargoFromRepo,
    _count: { users: 3 },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CargosService,
        { provide: CargosRepository, useValue: mockCargosRepository },
        { provide: AreasRepository, useValue: mockAreasRepository },
      ],
    }).compile();

    service = module.get<CargosService>(CargosService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ─────────────────────────────────────────────
  // findAll
  // ─────────────────────────────────────────────
  describe('findAll', () => {
    it('should return cargos with usersCount and without _count', async () => {
      mockCargosRepository.findAll.mockResolvedValue([mockCargoFromFindAll]);

      const result = await service.findAll();

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({ id: 'cargo-1', usersCount: 3 });
      // El service hace `_count: undefined` vía spread — la clave existe pero con valor undefined
      expect(result[0]._count).toBeUndefined();
    });

    it('should pass includeInactive flag to repository', async () => {
      mockCargosRepository.findAll.mockResolvedValue([]);

      await service.findAll(true);

      expect(mockCargosRepository.findAll).toHaveBeenCalledWith(true);
    });
  });

  // ─────────────────────────────────────────────
  // findByArea
  // ─────────────────────────────────────────────
  describe('findByArea', () => {
    it('should return cargos with usersCount when area exists', async () => {
      mockAreasRepository.findById.mockResolvedValue(mockActiveArea);
      mockCargosRepository.findByArea.mockResolvedValue([mockCargoFromFindAll]);

      const result = await service.findByArea('area-1');

      expect(result[0]).toMatchObject({ id: 'cargo-1', usersCount: 3 });
      expect(result[0]._count).toBeUndefined();
    });

    it('should throw NotFoundException when area does not exist', async () => {
      mockAreasRepository.findById.mockResolvedValue(null);

      await expect(service.findByArea('bad-id')).rejects.toThrow(NotFoundException);
      await expect(service.findByArea('bad-id')).rejects.toThrow(
        'Área con ID bad-id no encontrada',
      );
      expect(mockCargosRepository.findByArea).not.toHaveBeenCalled();
    });

    it('should pass areaId and includeInactive to repository', async () => {
      mockAreasRepository.findById.mockResolvedValue(mockActiveArea);
      mockCargosRepository.findByArea.mockResolvedValue([]);

      await service.findByArea('area-1', true);

      expect(mockCargosRepository.findByArea).toHaveBeenCalledWith('area-1', true);
    });
  });

  // ─────────────────────────────────────────────
  // findOne
  // ─────────────────────────────────────────────
  describe('findOne', () => {
    it('should return cargo with usersCount and without _count', async () => {
      mockCargosRepository.findById.mockResolvedValue(mockCargoFromRepo);

      const result = await service.findOne('cargo-1');

      expect(result).toMatchObject({ id: 'cargo-1', usersCount: 2 });
      expect(result._count).toBeUndefined();
    });

    it('should throw NotFoundException when cargo does not exist', async () => {
      mockCargosRepository.findById.mockResolvedValue(null);

      await expect(service.findOne('bad-id')).rejects.toThrow(NotFoundException);
      await expect(service.findOne('bad-id')).rejects.toThrow(
        'Cargo con ID bad-id no encontrado',
      );
    });
  });

  // ─────────────────────────────────────────────
  // create
  // ─────────────────────────────────────────────
  describe('create', () => {
    const createDto = {
      name: 'Tech Lead',
      description: 'Líder técnico',
      areaId: 'area-1',
    };

    beforeEach(() => {
      mockAreasRepository.findById.mockResolvedValue(mockActiveArea);
      mockCargosRepository.findByNameAndArea.mockResolvedValue(null);
      mockCargosRepository.create.mockResolvedValue(mockCargoFromRepo);
    });

    it('should create cargo with area connect syntax', async () => {
      await service.create(createDto);

      expect(mockCargosRepository.create).toHaveBeenCalledWith({
        name: createDto.name,
        description: createDto.description,
        area: { connect: { id: createDto.areaId } },
      });
    });

    it('should throw BadRequestException when area does not exist', async () => {
      mockAreasRepository.findById.mockResolvedValue(null);

      await expect(service.create(createDto)).rejects.toThrow(BadRequestException);
      await expect(service.create(createDto)).rejects.toThrow(
        `Área con ID ${createDto.areaId} no encontrada`,
      );
      expect(mockCargosRepository.create).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when area is inactive', async () => {
      mockAreasRepository.findById.mockResolvedValue(mockInactiveArea);

      await expect(service.create(createDto)).rejects.toThrow(BadRequestException);
      await expect(service.create(createDto)).rejects.toThrow(
        'No se puede crear un cargo en un área inactiva',
      );
      expect(mockCargosRepository.create).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when cargo name already exists in the area', async () => {
      mockCargosRepository.findByNameAndArea.mockResolvedValue({ id: 'existing' });

      await expect(service.create(createDto)).rejects.toThrow(BadRequestException);
      await expect(service.create(createDto)).rejects.toThrow(
        `Ya existe un cargo con el nombre "${createDto.name}" en esta área`,
      );
      expect(mockCargosRepository.create).not.toHaveBeenCalled();
    });
  });

  // ─────────────────────────────────────────────
  // update
  // ─────────────────────────────────────────────
  describe('update', () => {
    beforeEach(() => {
      mockCargosRepository.findById.mockResolvedValue(mockCargoFromRepo);
      mockAreasRepository.findById.mockResolvedValue(mockActiveArea);
      mockCargosRepository.findByNameAndAreaExcludingId.mockResolvedValue(null);
      mockCargosRepository.update.mockResolvedValue(mockCargoFromRepo);
    });

    it('should update cargo description without area validation', async () => {
      await service.update('cargo-1', { description: 'Nueva descripción' });

      expect(mockAreasRepository.findById).not.toHaveBeenCalled();
      expect(mockCargosRepository.update).toHaveBeenCalledWith(
        'cargo-1',
        expect.objectContaining({ description: 'Nueva descripción' }),
      );
    });

    it('should use Prisma connect syntax when areaId is provided', async () => {
      await service.update('cargo-1', { areaId: 'area-1' });

      const callArg = mockCargosRepository.update.mock.calls[0][1];
      expect(callArg).toHaveProperty('area', { connect: { id: 'area-1' } });
      expect(callArg).not.toHaveProperty('areaId');
    });

    it('should throw NotFoundException when cargo does not exist', async () => {
      mockCargosRepository.findById.mockResolvedValue(null);

      await expect(service.update('bad-id', { name: 'x' })).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when new area does not exist', async () => {
      mockAreasRepository.findById.mockResolvedValue(null);

      await expect(service.update('cargo-1', { areaId: 'bad-area' })).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.update('cargo-1', { areaId: 'bad-area' })).rejects.toThrow(
        'Área con ID bad-area no encontrada',
      );
    });

    it('should throw BadRequestException when new area is inactive', async () => {
      mockAreasRepository.findById.mockResolvedValue(mockInactiveArea);

      await expect(
        service.update('cargo-1', { areaId: 'area-2' }),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.update('cargo-1', { areaId: 'area-2' }),
      ).rejects.toThrow('No se puede mover el cargo a un área inactiva');
    });

    it('should throw BadRequestException when name already exists in target area', async () => {
      mockCargosRepository.findByNameAndAreaExcludingId.mockResolvedValue({ id: 'other' });

      await expect(service.update('cargo-1', { name: 'Tech Lead' })).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should not validate area when areaId is not changing', async () => {
      // areaId igual al actual → no debería buscar el área
      await service.update('cargo-1', { areaId: 'area-1' }); // same areaId as cargo.areaId

      // La validación de área se omite cuando el nuevo areaId === cargo.areaId
      // El findById del área NO debe llamarse en este caso
      expect(mockAreasRepository.findById).not.toHaveBeenCalled();
    });
  });

  // ─────────────────────────────────────────────
  // remove (soft delete)
  // ─────────────────────────────────────────────
  describe('remove', () => {
    it('should soft-delete cargo (isActive=false) and return success message', async () => {
      mockCargosRepository.findById.mockResolvedValue(mockCargoFromRepo);
      mockCargosRepository.countUsers.mockResolvedValue(0);
      mockCargosRepository.update.mockResolvedValue({});

      const result = await service.remove('cargo-1');

      expect(mockCargosRepository.update).toHaveBeenCalledWith('cargo-1', { isActive: false });
      expect(result).toEqual({ message: 'Cargo con ID cargo-1 eliminado correctamente' });
    });

    it('should throw NotFoundException when cargo does not exist', async () => {
      mockCargosRepository.findById.mockResolvedValue(null);

      await expect(service.remove('bad-id')).rejects.toThrow(NotFoundException);
      expect(mockCargosRepository.countUsers).not.toHaveBeenCalled();
      expect(mockCargosRepository.update).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when cargo has assigned users', async () => {
      mockCargosRepository.findById.mockResolvedValue(mockCargoFromRepo);
      mockCargosRepository.countUsers.mockResolvedValue(3);

      await expect(service.remove('cargo-1')).rejects.toThrow(BadRequestException);
      await expect(service.remove('cargo-1')).rejects.toThrow(
        'No se puede eliminar el cargo porque tiene 3 usuario(s) asignado(s)',
      );
      expect(mockCargosRepository.update).not.toHaveBeenCalled();
    });
  });
});
