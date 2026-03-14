import { Test, TestingModule } from '@nestjs/testing';
import { AreasRepository } from './areas.repository';
import { PrismaService } from '../../database/prisma.service';
import {
  createMockPrismaService,
  MockPrismaService,
} from '../../database/prisma.service.mock';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------
const mockArea = {
  id: 'area-1',
  name: 'Producción',
  description: 'Área de producción',
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  _count: { cargos: 3 },
};

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------
describe('AreasRepository', () => {
  let repository: AreasRepository;
  let prisma: MockPrismaService;

  beforeEach(async () => {
    prisma = createMockPrismaService();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AreasRepository,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    repository = module.get<AreasRepository>(AreasRepository);
  });

  afterEach(() => jest.clearAllMocks());

  // -------------------------------------------------------------------------
  // findAll
  // -------------------------------------------------------------------------
  describe('findAll', () => {
    it('should filter only active areas by default', async () => {
      prisma.area.findMany.mockResolvedValue([mockArea]);

      await repository.findAll();

      expect(prisma.area.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { isActive: true } }),
      );
    });

    it('should use empty where when includeInactive=true', async () => {
      prisma.area.findMany.mockResolvedValue([mockArea]);

      await repository.findAll(true);

      const callArg = prisma.area.findMany.mock.calls[0][0];
      expect(callArg.where).toEqual({});
    });

    it('should order results by name asc', async () => {
      prisma.area.findMany.mockResolvedValue([mockArea]);

      await repository.findAll();

      expect(prisma.area.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ orderBy: { name: 'asc' } }),
      );
    });

    it('should include _count of cargos in select', async () => {
      prisma.area.findMany.mockResolvedValue([mockArea]);

      await repository.findAll();

      const callArg = prisma.area.findMany.mock.calls[0][0];
      expect(callArg.select._count).toBeDefined();
    });
  });

  // -------------------------------------------------------------------------
  // findById
  // -------------------------------------------------------------------------
  describe('findById', () => {
    it('should call area.findUnique with the given id', async () => {
      prisma.area.findUnique.mockResolvedValue(mockArea);

      const result = await repository.findById('area-1');

      expect(prisma.area.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'area-1' } }),
      );
      expect(result).toEqual(mockArea);
    });

    it('should return null when area does not exist', async () => {
      prisma.area.findUnique.mockResolvedValue(null);

      const result = await repository.findById('nonexistent');

      expect(result).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // findByName
  // -------------------------------------------------------------------------
  describe('findByName', () => {
    it('should call area.findUnique with the given name', async () => {
      prisma.area.findUnique.mockResolvedValue(mockArea);

      await repository.findByName('Producción');

      expect(prisma.area.findUnique).toHaveBeenCalledWith({ where: { name: 'Producción' } });
    });
  });

  // -------------------------------------------------------------------------
  // findByNameExcludingId
  // -------------------------------------------------------------------------
  describe('findByNameExcludingId', () => {
    it('should use findFirst with NOT id clause', async () => {
      prisma.area.findFirst.mockResolvedValue(null);

      await repository.findByNameExcludingId('Producción', 'area-2');

      expect(prisma.area.findFirst).toHaveBeenCalledWith({
        where: { name: 'Producción', NOT: { id: 'area-2' } },
      });
    });
  });

  // -------------------------------------------------------------------------
  // create
  // -------------------------------------------------------------------------
  describe('create', () => {
    it('should call area.create with the provided data', async () => {
      prisma.area.create.mockResolvedValue(mockArea);

      await repository.create({ name: 'Nueva Área' } as any);

      expect(prisma.area.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: { name: 'Nueva Área' } }),
      );
    });
  });

  // -------------------------------------------------------------------------
  // update
  // -------------------------------------------------------------------------
  describe('update', () => {
    it('should call area.update with the given id and data', async () => {
      prisma.area.update.mockResolvedValue(mockArea);

      await repository.update('area-1', { name: 'Área Actualizada' } as any);

      expect(prisma.area.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'area-1' },
          data: { name: 'Área Actualizada' },
        }),
      );
    });
  });

  // -------------------------------------------------------------------------
  // countActiveCargos
  // -------------------------------------------------------------------------
  describe('countActiveCargos', () => {
    it('should count active cargos for the given areaId', async () => {
      prisma.cargo.count.mockResolvedValue(5);

      const result = await repository.countActiveCargos('area-1');

      expect(prisma.cargo.count).toHaveBeenCalledWith({
        where: { areaId: 'area-1', isActive: true },
      });
      expect(result).toBe(5);
    });
  });

  // -------------------------------------------------------------------------
  // delete
  // -------------------------------------------------------------------------
  describe('delete', () => {
    it('should call area.delete with the given id', async () => {
      prisma.area.delete.mockResolvedValue(mockArea);

      await repository.delete('area-1');

      expect(prisma.area.delete).toHaveBeenCalledWith({ where: { id: 'area-1' } });
    });
  });
});
