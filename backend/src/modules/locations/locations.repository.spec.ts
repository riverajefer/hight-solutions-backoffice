import { Test, TestingModule } from '@nestjs/testing';
import { LocationsRepository } from './locations.repository';
import { PrismaService } from '../../database/prisma.service';
import {
  createMockPrismaService,
  MockPrismaService,
} from '../../database/prisma.service.mock';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------
const mockDepartment = {
  id: 'dept-1',
  name: 'Cundinamarca',
  code: '25',
  createdAt: new Date(),
  updatedAt: new Date(),
  _count: { cities: 10 },
};

const mockCity = {
  id: 'city-1',
  name: 'Bogotá',
  departmentId: 'dept-1',
  createdAt: new Date(),
  updatedAt: new Date(),
};

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------
describe('LocationsRepository', () => {
  let repository: LocationsRepository;
  let prisma: MockPrismaService;

  beforeEach(async () => {
    prisma = createMockPrismaService();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LocationsRepository,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    repository = module.get<LocationsRepository>(LocationsRepository);
  });

  afterEach(() => jest.clearAllMocks());

  // -------------------------------------------------------------------------
  // findAllDepartments
  // -------------------------------------------------------------------------
  describe('findAllDepartments', () => {
    it('should return departments ordered by name asc', async () => {
      prisma.department.findMany.mockResolvedValue([mockDepartment]);

      const result = await repository.findAllDepartments();

      expect(prisma.department.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ orderBy: { name: 'asc' } }),
      );
      expect(result).toEqual([mockDepartment]);
    });

    it('should include _count of cities in select', async () => {
      prisma.department.findMany.mockResolvedValue([mockDepartment]);

      await repository.findAllDepartments();

      const callArg = prisma.department.findMany.mock.calls[0][0];
      expect(callArg.select._count).toBeDefined();
    });
  });

  // -------------------------------------------------------------------------
  // findDepartmentById
  // -------------------------------------------------------------------------
  describe('findDepartmentById', () => {
    it('should call department.findUnique with the given id', async () => {
      prisma.department.findUnique.mockResolvedValue(mockDepartment);

      const result = await repository.findDepartmentById('dept-1');

      expect(prisma.department.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'dept-1' } }),
      );
      expect(result).toEqual(mockDepartment);
    });

    it('should return null when department does not exist', async () => {
      prisma.department.findUnique.mockResolvedValue(null);

      const result = await repository.findDepartmentById('nonexistent');

      expect(result).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // findCitiesByDepartment
  // -------------------------------------------------------------------------
  describe('findCitiesByDepartment', () => {
    it('should filter cities by departmentId and order by name', async () => {
      prisma.city.findMany.mockResolvedValue([mockCity]);

      const result = await repository.findCitiesByDepartment('dept-1');

      expect(prisma.city.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { departmentId: 'dept-1' },
          orderBy: { name: 'asc' },
        }),
      );
      expect(result).toEqual([mockCity]);
    });
  });

  // -------------------------------------------------------------------------
  // findCityById
  // -------------------------------------------------------------------------
  describe('findCityById', () => {
    it('should call city.findUnique with the given id', async () => {
      prisma.city.findUnique.mockResolvedValue(mockCity);

      const result = await repository.findCityById('city-1');

      expect(prisma.city.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'city-1' } }),
      );
      expect(result).toEqual(mockCity);
    });

    it('should return null when city does not exist', async () => {
      prisma.city.findUnique.mockResolvedValue(null);

      const result = await repository.findCityById('nonexistent');

      expect(result).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // cityBelongsToDepartment
  // -------------------------------------------------------------------------
  describe('cityBelongsToDepartment', () => {
    it('should return true when city belongs to the department', async () => {
      prisma.city.findFirst.mockResolvedValue(mockCity);

      const result = await repository.cityBelongsToDepartment('city-1', 'dept-1');

      expect(prisma.city.findFirst).toHaveBeenCalledWith({
        where: { id: 'city-1', departmentId: 'dept-1' },
      });
      expect(result).toBe(true);
    });

    it('should return false when city does not belong to the department', async () => {
      prisma.city.findFirst.mockResolvedValue(null);

      const result = await repository.cityBelongsToDepartment('city-1', 'dept-2');

      expect(result).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // findDepartmentByName
  // -------------------------------------------------------------------------
  describe('findDepartmentByName', () => {
    it('should use case-insensitive mode when searching by name', async () => {
      prisma.department.findFirst.mockResolvedValue(mockDepartment);

      await repository.findDepartmentByName('cundinamarca');

      expect(prisma.department.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { name: { equals: 'cundinamarca', mode: 'insensitive' } },
        }),
      );
    });
  });

  // -------------------------------------------------------------------------
  // findCityByNameAndDepartment
  // -------------------------------------------------------------------------
  describe('findCityByNameAndDepartment', () => {
    it('should filter by city name (insensitive) and departmentId', async () => {
      prisma.city.findFirst.mockResolvedValue(mockCity);

      await repository.findCityByNameAndDepartment('bogotá', 'dept-1');

      expect(prisma.city.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            name: { equals: 'bogotá', mode: 'insensitive' },
            departmentId: 'dept-1',
          },
        }),
      );
    });
  });
});
