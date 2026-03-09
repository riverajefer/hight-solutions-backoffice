import { Test, TestingModule } from '@nestjs/testing';
import { ExpenseTypesController } from './expense-types.controller';
import { ExpenseTypesService } from './expense-types.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';

const mockService = {
  findAllTypes: jest.fn(),
  findOneType: jest.fn(),
  createType: jest.fn(),
  updateType: jest.fn(),
  removeType: jest.fn(),
  findAllSubcategories: jest.fn(),
  findOneSubcategory: jest.fn(),
  createSubcategory: jest.fn(),
  updateSubcategory: jest.fn(),
  removeSubcategory: jest.fn(),
};

const TYPE_ID = 'type-1';
const SUB_ID = 'sub-1';

describe('ExpenseTypesController', () => {
  let controller: ExpenseTypesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ExpenseTypesController],
      providers: [{ provide: ExpenseTypesService, useValue: mockService }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(PermissionsGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<ExpenseTypesController>(ExpenseTypesController);
  });

  afterEach(() => jest.clearAllMocks());

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  // ─── Types ────────────────────────────────────────────────────────────────

  describe('findAllTypes', () => {
    it('should call service.findAllTypes', async () => {
      mockService.findAllTypes.mockResolvedValue([]);
      await controller.findAllTypes();
      expect(mockService.findAllTypes).toHaveBeenCalled();
    });
  });

  describe('findOneType', () => {
    it('should call service.findOneType with id', async () => {
      await controller.findOneType(TYPE_ID);
      expect(mockService.findOneType).toHaveBeenCalledWith(TYPE_ID);
    });
  });

  describe('createType', () => {
    it('should call service.createType with dto', async () => {
      const dto = { name: 'Servicios', description: 'desc' };
      await controller.createType(dto);
      expect(mockService.createType).toHaveBeenCalledWith(dto);
    });
  });

  describe('updateType', () => {
    it('should call service.updateType with id and dto', async () => {
      const dto = { name: 'Actualizado' };
      await controller.updateType(TYPE_ID, dto);
      expect(mockService.updateType).toHaveBeenCalledWith(TYPE_ID, dto);
    });
  });

  describe('removeType', () => {
    it('should call service.removeType with id', async () => {
      await controller.removeType(TYPE_ID);
      expect(mockService.removeType).toHaveBeenCalledWith(TYPE_ID);
    });
  });

  // ─── Subcategories ────────────────────────────────────────────────────────

  describe('findAllSubcategories', () => {
    it('should call service.findAllSubcategories without filter', async () => {
      mockService.findAllSubcategories.mockResolvedValue([]);
      await controller.findAllSubcategories(undefined);
      expect(mockService.findAllSubcategories).toHaveBeenCalledWith(undefined);
    });

    it('should pass expenseTypeId filter to service', async () => {
      mockService.findAllSubcategories.mockResolvedValue([]);
      await controller.findAllSubcategories(TYPE_ID);
      expect(mockService.findAllSubcategories).toHaveBeenCalledWith(TYPE_ID);
    });
  });

  describe('findOneSubcategory', () => {
    it('should call service.findOneSubcategory with id', async () => {
      await controller.findOneSubcategory(SUB_ID);
      expect(mockService.findOneSubcategory).toHaveBeenCalledWith(SUB_ID);
    });
  });

  describe('createSubcategory', () => {
    it('should call service.createSubcategory with dto', async () => {
      const dto = { expenseTypeId: TYPE_ID, name: 'Tornillos' };
      await controller.createSubcategory(dto);
      expect(mockService.createSubcategory).toHaveBeenCalledWith(dto);
    });
  });

  describe('updateSubcategory', () => {
    it('should call service.updateSubcategory with id and dto', async () => {
      const dto = { name: 'Actualizado' };
      await controller.updateSubcategory(SUB_ID, dto);
      expect(mockService.updateSubcategory).toHaveBeenCalledWith(SUB_ID, dto);
    });
  });

  describe('removeSubcategory', () => {
    it('should call service.removeSubcategory with id', async () => {
      await controller.removeSubcategory(SUB_ID);
      expect(mockService.removeSubcategory).toHaveBeenCalledWith(SUB_ID);
    });
  });
});
