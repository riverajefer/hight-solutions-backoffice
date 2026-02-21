import { Test, TestingModule } from '@nestjs/testing';
import { LocationsController } from './locations.controller';
import { LocationsService } from './locations.service';

const mockLocationsService = {
  findAllDepartments: jest.fn(),
  findDepartmentById: jest.fn(),
  findCitiesByDepartment: jest.fn(),
  findCityById: jest.fn(),
};

describe('LocationsController', () => {
  let controller: LocationsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [LocationsController],
      providers: [{ provide: LocationsService, useValue: mockLocationsService }],
    }).compile();
    controller = module.get<LocationsController>(LocationsController);
  });

  afterEach(() => jest.clearAllMocks());

  describe('findAllDepartments', () => {
    it('should delegate to locationsService.findAllDepartments', async () => {
      mockLocationsService.findAllDepartments.mockResolvedValue([{ id: 'dept-1' }]);
      const result = await controller.findAllDepartments();
      expect(mockLocationsService.findAllDepartments).toHaveBeenCalled();
      expect(result).toEqual([{ id: 'dept-1' }]);
    });
  });

  describe('findDepartmentById', () => {
    it('should delegate to locationsService.findDepartmentById', async () => {
      mockLocationsService.findDepartmentById.mockResolvedValue({ id: 'dept-1', name: 'Cundinamarca' });
      const result = await controller.findDepartmentById('dept-1');
      expect(mockLocationsService.findDepartmentById).toHaveBeenCalledWith('dept-1');
      expect(result).toEqual({ id: 'dept-1', name: 'Cundinamarca' });
    });
  });

  describe('findCitiesByDepartment', () => {
    it('should delegate to locationsService.findCitiesByDepartment', async () => {
      mockLocationsService.findCitiesByDepartment.mockResolvedValue([{ id: 'city-1' }]);
      const result = await controller.findCitiesByDepartment('dept-1');
      expect(mockLocationsService.findCitiesByDepartment).toHaveBeenCalledWith('dept-1');
      expect(result).toEqual([{ id: 'city-1' }]);
    });
  });

  describe('findCityById', () => {
    it('should delegate to locationsService.findCityById', async () => {
      mockLocationsService.findCityById.mockResolvedValue({ id: 'city-1', name: 'Bogotá' });
      const result = await controller.findCityById('city-1');
      expect(mockLocationsService.findCityById).toHaveBeenCalledWith('city-1');
      expect(result).toEqual({ id: 'city-1', name: 'Bogotá' });
    });
  });
});
