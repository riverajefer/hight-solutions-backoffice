import { Test, TestingModule } from '@nestjs/testing';
import { UnitsOfMeasureRepository } from './units-of-measure.repository';
import { PrismaService } from '../../../database/prisma.service';
import {
  createMockPrismaService,
  MockPrismaService,
} from '../../../database/prisma.service.mock';

const mockUnit = {
  id: 'unit-1',
  name: 'Litro',
  abbreviation: 'L',
  description: 'Unidad de volumen',
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('UnitsOfMeasureRepository', () => {
  let repository: UnitsOfMeasureRepository;
  let prisma: MockPrismaService;

  beforeEach(async () => {
    prisma = createMockPrismaService();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UnitsOfMeasureRepository,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    repository = module.get<UnitsOfMeasureRepository>(UnitsOfMeasureRepository);
  });

  afterEach(() => jest.clearAllMocks());

  describe('findAll', () => {
    it('should filter only active units by default', async () => {
      prisma.unitOfMeasure.findMany.mockResolvedValue([mockUnit]);
      await repository.findAll();
      expect(prisma.unitOfMeasure.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { isActive: true } }),
      );
    });

    it('should use empty where when includeInactive=true', async () => {
      prisma.unitOfMeasure.findMany.mockResolvedValue([mockUnit]);
      await repository.findAll(true);
      const callArg = prisma.unitOfMeasure.findMany.mock.calls[0][0];
      expect(callArg.where).toEqual({});
    });

    it('should order by name asc', async () => {
      prisma.unitOfMeasure.findMany.mockResolvedValue([mockUnit]);
      await repository.findAll();
      expect(prisma.unitOfMeasure.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ orderBy: { name: 'asc' } }),
      );
    });
  });

  describe('findById', () => {
    it('should call unitOfMeasure.findUnique with the given id', async () => {
      prisma.unitOfMeasure.findUnique.mockResolvedValue(mockUnit);
      const result = await repository.findById('unit-1');
      expect(prisma.unitOfMeasure.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'unit-1' } }),
      );
      expect(result).toEqual(mockUnit);
    });

    it('should return null when unit does not exist', async () => {
      prisma.unitOfMeasure.findUnique.mockResolvedValue(null);
      expect(await repository.findById('nonexistent')).toBeNull();
    });
  });

  describe('findByName', () => {
    it('should call unitOfMeasure.findUnique with the given name', async () => {
      prisma.unitOfMeasure.findUnique.mockResolvedValue(mockUnit);
      await repository.findByName('Litro');
      expect(prisma.unitOfMeasure.findUnique).toHaveBeenCalledWith({ where: { name: 'Litro' } });
    });
  });

  describe('findByNameExcludingId', () => {
    it('should use findFirst with NOT id clause', async () => {
      prisma.unitOfMeasure.findFirst.mockResolvedValue(null);
      await repository.findByNameExcludingId('Litro', 'unit-2');
      expect(prisma.unitOfMeasure.findFirst).toHaveBeenCalledWith({
        where: { name: 'Litro', NOT: { id: 'unit-2' } },
      });
    });
  });

  describe('findByAbbreviation', () => {
    it('should call unitOfMeasure.findUnique with the given abbreviation', async () => {
      prisma.unitOfMeasure.findUnique.mockResolvedValue(mockUnit);
      await repository.findByAbbreviation('L');
      expect(prisma.unitOfMeasure.findUnique).toHaveBeenCalledWith({ where: { abbreviation: 'L' } });
    });
  });

  describe('findByAbbreviationExcludingId', () => {
    it('should use findFirst with NOT id clause', async () => {
      prisma.unitOfMeasure.findFirst.mockResolvedValue(null);
      await repository.findByAbbreviationExcludingId('L', 'unit-2');
      expect(prisma.unitOfMeasure.findFirst).toHaveBeenCalledWith({
        where: { abbreviation: 'L', NOT: { id: 'unit-2' } },
      });
    });
  });

  describe('create', () => {
    it('should call unitOfMeasure.create with the provided data', async () => {
      prisma.unitOfMeasure.create.mockResolvedValue(mockUnit);
      await repository.create({ name: 'Kilo', abbreviation: 'kg' } as any);
      expect(prisma.unitOfMeasure.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: { name: 'Kilo', abbreviation: 'kg' } }),
      );
    });
  });

  describe('update', () => {
    it('should call unitOfMeasure.update with the given id and data', async () => {
      prisma.unitOfMeasure.update.mockResolvedValue(mockUnit);
      await repository.update('unit-1', { name: 'Actualizado' } as any);
      expect(prisma.unitOfMeasure.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'unit-1' }, data: { name: 'Actualizado' } }),
      );
    });
  });

  describe('delete', () => {
    it('should call unitOfMeasure.delete with the given id', async () => {
      prisma.unitOfMeasure.delete.mockResolvedValue(mockUnit);
      await repository.delete('unit-1');
      expect(prisma.unitOfMeasure.delete).toHaveBeenCalledWith({ where: { id: 'unit-1' } });
    });
  });
});
