import { Test, TestingModule } from '@nestjs/testing';
import { ExpenseTypesRepository } from './expense-types.repository';
import { PrismaService } from '../../database/prisma.service';
import { createMockPrismaService, MockPrismaService } from '../../database/prisma.service.mock';

const TYPE_ID = 'type-1';
const SUB_ID = 'sub-1';

const mockType = {
  id: TYPE_ID,
  name: 'Materiales',
  description: 'Gastos de materiales',
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockSubcategory = {
  id: SUB_ID,
  expenseTypeId: TYPE_ID,
  name: 'Madera',
  isActive: true,
  expenseType: { id: TYPE_ID, name: 'Materiales' },
};

describe('ExpenseTypesRepository', () => {
  let repository: ExpenseTypesRepository;
  let prisma: MockPrismaService;

  beforeEach(async () => {
    prisma = createMockPrismaService();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExpenseTypesRepository,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    repository = module.get<ExpenseTypesRepository>(ExpenseTypesRepository);
  });

  afterEach(() => jest.clearAllMocks());

  // ─── findAllTypes ─────────────────────────────────────────────────────────

  describe('findAllTypes', () => {
    it('should query only active types ordered by name', async () => {
      prisma.expenseType.findMany.mockResolvedValue([mockType]);

      const result = await repository.findAllTypes();

      expect(prisma.expenseType.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { isActive: true },
          orderBy: { name: 'asc' },
        }),
      );
      expect(result).toEqual([mockType]);
    });

    it('should include active subcategories', async () => {
      prisma.expenseType.findMany.mockResolvedValue([]);

      await repository.findAllTypes();

      const call = prisma.expenseType.findMany.mock.calls[0][0];
      expect(call.include.subcategories.where).toEqual({ isActive: true });
    });
  });

  // ─── findTypeById ─────────────────────────────────────────────────────────

  describe('findTypeById', () => {
    it('should call findUnique with the given id', async () => {
      prisma.expenseType.findUnique.mockResolvedValue(mockType);

      const result = await repository.findTypeById(TYPE_ID);

      expect(prisma.expenseType.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: TYPE_ID } }),
      );
      expect(result).toEqual(mockType);
    });

    it('should return null when type does not exist', async () => {
      prisma.expenseType.findUnique.mockResolvedValue(null);

      expect(await repository.findTypeById('bad-id')).toBeNull();
    });
  });

  // ─── createType ───────────────────────────────────────────────────────────

  describe('createType', () => {
    it('should call expenseType.create with provided data', async () => {
      const data = { name: 'Servicios', description: 'Servicios externos' };
      prisma.expenseType.create.mockResolvedValue({ id: 'new', ...data });

      await repository.createType(data);

      expect(prisma.expenseType.create).toHaveBeenCalledWith({ data });
    });
  });

  // ─── updateType ───────────────────────────────────────────────────────────

  describe('updateType', () => {
    it('should call expenseType.update with id and data', async () => {
      const data = { name: 'Materiales Actualizado' };
      prisma.expenseType.update.mockResolvedValue({ ...mockType, ...data });

      await repository.updateType(TYPE_ID, data);

      expect(prisma.expenseType.update).toHaveBeenCalledWith({
        where: { id: TYPE_ID },
        data,
      });
    });
  });

  // ─── deleteType (soft delete) ─────────────────────────────────────────────

  describe('deleteType', () => {
    it('should set isActive=false (soft delete)', async () => {
      prisma.expenseType.update.mockResolvedValue({ ...mockType, isActive: false });

      await repository.deleteType(TYPE_ID);

      expect(prisma.expenseType.update).toHaveBeenCalledWith({
        where: { id: TYPE_ID },
        data: { isActive: false },
      });
    });
  });

  // ─── findAllSubcategories ─────────────────────────────────────────────────

  describe('findAllSubcategories', () => {
    it('should return all active subcategories without filter', async () => {
      prisma.expenseSubcategory.findMany.mockResolvedValue([mockSubcategory]);

      await repository.findAllSubcategories();

      const call = prisma.expenseSubcategory.findMany.mock.calls[0][0];
      expect(call.where).toEqual({ isActive: true });
    });

    it('should filter by expenseTypeId when provided', async () => {
      prisma.expenseSubcategory.findMany.mockResolvedValue([mockSubcategory]);

      await repository.findAllSubcategories(TYPE_ID);

      const call = prisma.expenseSubcategory.findMany.mock.calls[0][0];
      expect(call.where).toEqual({ isActive: true, expenseTypeId: TYPE_ID });
    });
  });

  // ─── findSubcategoryById ──────────────────────────────────────────────────

  describe('findSubcategoryById', () => {
    it('should call findUnique with the given id', async () => {
      prisma.expenseSubcategory.findUnique.mockResolvedValue(mockSubcategory);

      const result = await repository.findSubcategoryById(SUB_ID);

      expect(prisma.expenseSubcategory.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: SUB_ID } }),
      );
      expect(result).toEqual(mockSubcategory);
    });

    it('should return null when not found', async () => {
      prisma.expenseSubcategory.findUnique.mockResolvedValue(null);

      expect(await repository.findSubcategoryById('bad-id')).toBeNull();
    });
  });

  // ─── createSubcategory ────────────────────────────────────────────────────

  describe('createSubcategory', () => {
    it('should call expenseSubcategory.create with provided data', async () => {
      const data = { expenseTypeId: TYPE_ID, name: 'Tornillos' };
      prisma.expenseSubcategory.create.mockResolvedValue({ id: 'new-sub', ...data });

      await repository.createSubcategory(data);

      expect(prisma.expenseSubcategory.create).toHaveBeenCalledWith(
        expect.objectContaining({ data }),
      );
    });
  });

  // ─── updateSubcategory ────────────────────────────────────────────────────

  describe('updateSubcategory', () => {
    it('should call expenseSubcategory.update with id and data', async () => {
      const data = { name: 'Madera Actualizada' };
      prisma.expenseSubcategory.update.mockResolvedValue({ ...mockSubcategory, ...data });

      await repository.updateSubcategory(SUB_ID, data);

      expect(prisma.expenseSubcategory.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: SUB_ID },
          data,
        }),
      );
    });
  });

  // ─── deleteSubcategory (soft delete) ──────────────────────────────────────

  describe('deleteSubcategory', () => {
    it('should set isActive=false (soft delete)', async () => {
      prisma.expenseSubcategory.update.mockResolvedValue({ ...mockSubcategory, isActive: false });

      await repository.deleteSubcategory(SUB_ID);

      expect(prisma.expenseSubcategory.update).toHaveBeenCalledWith({
        where: { id: SUB_ID },
        data: { isActive: false },
      });
    });
  });
});
