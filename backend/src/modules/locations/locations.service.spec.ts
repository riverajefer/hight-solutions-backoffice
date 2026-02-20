import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { LocationsService } from './locations.service';
import { LocationsRepository } from './locations.repository';

const mockLocationsRepository = {
  findAllDepartments: jest.fn(),
  findDepartmentById: jest.fn(),
  findCitiesByDepartment: jest.fn(),
  cityBelongsToDepartment: jest.fn(),
  findCityById: jest.fn(),
  findDepartmentByName: jest.fn(),
  findCityByNameAndDepartment: jest.fn(),
};

describe('LocationsService', () => {
  let service: LocationsService;

  // Fixture: departamento como lo devuelve findAllDepartments (con _count)
  const mockDepartmentFromFindAll = {
    id: 'dept-1',
    name: 'Antioquia',
    code: 'ANT',
    createdAt: new Date(),
    updatedAt: new Date(),
    _count: { cities: 5 },
  };

  // Fixture: departamento como lo devuelve findDepartmentById (con ciudades)
  const mockDepartmentFromFindById = {
    id: 'dept-1',
    name: 'Antioquia',
    code: 'ANT',
    createdAt: new Date(),
    updatedAt: new Date(),
    cities: [
      { id: 'city-1', name: 'Medellín', createdAt: new Date(), updatedAt: new Date() },
      { id: 'city-2', name: 'Envigado', createdAt: new Date(), updatedAt: new Date() },
    ],
  };

  const mockCity = {
    id: 'city-1',
    name: 'Medellín',
    departmentId: 'dept-1',
    createdAt: new Date(),
    updatedAt: new Date(),
    department: { id: 'dept-1', name: 'Antioquia', code: 'ANT' },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LocationsService,
        { provide: LocationsRepository, useValue: mockLocationsRepository },
      ],
    }).compile();

    service = module.get<LocationsService>(LocationsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ─────────────────────────────────────────────
  // findAllDepartments
  // ─────────────────────────────────────────────
  describe('findAllDepartments', () => {
    it('should return departments with citiesCount and without _count', async () => {
      mockLocationsRepository.findAllDepartments.mockResolvedValue([mockDepartmentFromFindAll]);

      const result = await service.findAllDepartments();

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({ id: 'dept-1', name: 'Antioquia', citiesCount: 5 });
      // El service hace `_count: undefined` vía spread
      expect(result[0]._count).toBeUndefined();
    });

    it('should return empty array when no departments exist', async () => {
      mockLocationsRepository.findAllDepartments.mockResolvedValue([]);

      const result = await service.findAllDepartments();

      expect(result).toEqual([]);
    });
  });

  // ─────────────────────────────────────────────
  // findDepartmentById
  // ─────────────────────────────────────────────
  describe('findDepartmentById', () => {
    it('should return department with cities when found', async () => {
      mockLocationsRepository.findDepartmentById.mockResolvedValue(mockDepartmentFromFindById);

      const result = await service.findDepartmentById('dept-1');

      expect(result).toEqual(mockDepartmentFromFindById);
      expect(result.cities).toHaveLength(2);
    });

    it('should throw NotFoundException when department does not exist', async () => {
      mockLocationsRepository.findDepartmentById.mockResolvedValue(null);

      await expect(service.findDepartmentById('bad-id')).rejects.toThrow(NotFoundException);
      await expect(service.findDepartmentById('bad-id')).rejects.toThrow(
        'Departamento con ID bad-id no encontrado',
      );
    });
  });

  // ─────────────────────────────────────────────
  // findCitiesByDepartment
  // ─────────────────────────────────────────────
  describe('findCitiesByDepartment', () => {
    it('should return cities when department exists', async () => {
      const mockCities = [
        { id: 'city-1', name: 'Medellín', departmentId: 'dept-1' },
        { id: 'city-2', name: 'Envigado', departmentId: 'dept-1' },
      ];
      mockLocationsRepository.findDepartmentById.mockResolvedValue(mockDepartmentFromFindById);
      mockLocationsRepository.findCitiesByDepartment.mockResolvedValue(mockCities);

      const result = await service.findCitiesByDepartment('dept-1');

      expect(result).toEqual(mockCities);
      expect(mockLocationsRepository.findCitiesByDepartment).toHaveBeenCalledWith('dept-1');
    });

    it('should throw NotFoundException when department does not exist', async () => {
      mockLocationsRepository.findDepartmentById.mockResolvedValue(null);

      await expect(service.findCitiesByDepartment('bad-id')).rejects.toThrow(NotFoundException);
      expect(mockLocationsRepository.findCitiesByDepartment).not.toHaveBeenCalled();
    });
  });

  // ─────────────────────────────────────────────
  // validateCityBelongsToDepartment
  // ─────────────────────────────────────────────
  describe('validateCityBelongsToDepartment', () => {
    it('should return true when city belongs to department', async () => {
      mockLocationsRepository.cityBelongsToDepartment.mockResolvedValue(true);

      const result = await service.validateCityBelongsToDepartment('city-1', 'dept-1');

      expect(result).toBe(true);
      expect(mockLocationsRepository.cityBelongsToDepartment).toHaveBeenCalledWith(
        'city-1',
        'dept-1',
      );
    });

    it('should return false when city does not belong to department', async () => {
      mockLocationsRepository.cityBelongsToDepartment.mockResolvedValue(false);

      const result = await service.validateCityBelongsToDepartment('city-1', 'dept-2');

      expect(result).toBe(false);
    });
  });

  // ─────────────────────────────────────────────
  // findCityById
  // ─────────────────────────────────────────────
  describe('findCityById', () => {
    it('should return city when found', async () => {
      mockLocationsRepository.findCityById.mockResolvedValue(mockCity);

      const result = await service.findCityById('city-1');

      expect(result).toEqual(mockCity);
    });

    it('should throw NotFoundException when city does not exist', async () => {
      mockLocationsRepository.findCityById.mockResolvedValue(null);

      await expect(service.findCityById('bad-id')).rejects.toThrow(NotFoundException);
      await expect(service.findCityById('bad-id')).rejects.toThrow(
        'Ciudad con ID bad-id no encontrada',
      );
    });
  });

  // ─────────────────────────────────────────────
  // findDepartmentByName
  // ─────────────────────────────────────────────
  describe('findDepartmentByName', () => {
    it('should return department when found by name', async () => {
      const mockResult = { id: 'dept-1', name: 'Antioquia' };
      mockLocationsRepository.findDepartmentByName.mockResolvedValue(mockResult);

      const result = await service.findDepartmentByName('Antioquia');

      expect(result).toEqual(mockResult);
      expect(mockLocationsRepository.findDepartmentByName).toHaveBeenCalledWith('Antioquia');
    });

    it('should return null (NOT throw) when department not found', async () => {
      mockLocationsRepository.findDepartmentByName.mockResolvedValue(null);

      const result = await service.findDepartmentByName('Nonexistent');

      expect(result).toBeNull();
    });
  });

  // ─────────────────────────────────────────────
  // findCityByNameAndDepartment
  // ─────────────────────────────────────────────
  describe('findCityByNameAndDepartment', () => {
    it('should return city when found by name and department', async () => {
      const mockResult = { id: 'city-1', name: 'Medellín' };
      mockLocationsRepository.findCityByNameAndDepartment.mockResolvedValue(mockResult);

      const result = await service.findCityByNameAndDepartment('Medellín', 'dept-1');

      expect(result).toEqual(mockResult);
      expect(mockLocationsRepository.findCityByNameAndDepartment).toHaveBeenCalledWith(
        'Medellín',
        'dept-1',
      );
    });

    it('should return null (NOT throw) when city not found', async () => {
      mockLocationsRepository.findCityByNameAndDepartment.mockResolvedValue(null);

      const result = await service.findCityByNameAndDepartment('Nonexistent', 'dept-1');

      expect(result).toBeNull();
    });
  });
});
