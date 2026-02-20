import { Test, TestingModule } from '@nestjs/testing';
import { ConsecutivesRepository } from './consecutives.repository';
import { PrismaService } from '../../database/prisma.service';
import {
  createMockPrismaService,
  MockPrismaService,
} from '../../database/prisma.service.mock';

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------
describe('ConsecutivesRepository', () => {
  let repository: ConsecutivesRepository;
  let prisma: MockPrismaService;

  const CURRENT_YEAR = new Date().getFullYear();

  beforeEach(async () => {
    prisma = createMockPrismaService();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConsecutivesRepository,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    repository = module.get<ConsecutivesRepository>(ConsecutivesRepository);
  });

  afterEach(() => jest.clearAllMocks());

  // ---------------------------------------------------------------------------
  // getNextNumber
  // ---------------------------------------------------------------------------
  describe('getNextNumber', () => {
    it('should use upsert with lastNumber=1 when no existing record', async () => {
      prisma.consecutive.findUnique.mockResolvedValue(null);
      prisma.consecutive.upsert.mockResolvedValue({
        type: 'ORDER',
        prefix: 'OP',
        year: CURRENT_YEAR,
        lastNumber: 1,
      });

      await repository.getNextNumber('ORDER', 'OP');

      expect(prisma.consecutive.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { type: 'ORDER' },
          create: expect.objectContaining({ lastNumber: 1, year: CURRENT_YEAR }),
          update: expect.objectContaining({ lastNumber: 1, year: CURRENT_YEAR }),
        }),
      );
    });

    it('should use upsert with reset when existing record has a different year', async () => {
      prisma.consecutive.findUnique.mockResolvedValue({
        type: 'ORDER',
        year: CURRENT_YEAR - 1, // previous year
        lastNumber: 100,
      });
      prisma.consecutive.upsert.mockResolvedValue({
        type: 'ORDER',
        prefix: 'OP',
        year: CURRENT_YEAR,
        lastNumber: 1,
      });

      await repository.getNextNumber('ORDER', 'OP');

      expect(prisma.consecutive.upsert).toHaveBeenCalled();
      expect(prisma.consecutive.update).not.toHaveBeenCalled();
    });

    it('should use update with increment when existing record has the same year', async () => {
      prisma.consecutive.findUnique.mockResolvedValue({
        type: 'ORDER',
        year: CURRENT_YEAR,
        lastNumber: 5,
      });
      prisma.consecutive.update.mockResolvedValue({
        type: 'ORDER',
        prefix: 'OP',
        year: CURRENT_YEAR,
        lastNumber: 6,
      });

      await repository.getNextNumber('ORDER', 'OP');

      expect(prisma.consecutive.update).toHaveBeenCalledWith({
        where: { type: 'ORDER' },
        data: { lastNumber: { increment: 1 } },
      });
      expect(prisma.consecutive.upsert).not.toHaveBeenCalled();
    });

    it('should return formatted string with prefix, year, and zero-padded number', async () => {
      prisma.consecutive.findUnique.mockResolvedValue({
        type: 'ORDER',
        year: CURRENT_YEAR,
        lastNumber: 42,
      });
      prisma.consecutive.update.mockResolvedValue({
        type: 'ORDER',
        prefix: 'OP',
        year: CURRENT_YEAR,
        lastNumber: 43,
      });

      const result = await repository.getNextNumber('ORDER', 'OP');

      expect(result).toBe(`OP-${CURRENT_YEAR}-0043`);
    });

    it('should pad numbers to 4 digits (e.g. 1 → "0001")', async () => {
      prisma.consecutive.findUnique.mockResolvedValue(null);
      prisma.consecutive.upsert.mockResolvedValue({
        type: 'QUOTE',
        prefix: 'COT',
        year: CURRENT_YEAR,
        lastNumber: 1,
      });

      const result = await repository.getNextNumber('QUOTE', 'COT');

      expect(result).toMatch(/COT-\d{4}-0001/);
    });

    it('should use the provided year parameter when given', async () => {
      prisma.consecutive.findUnique.mockResolvedValue(null);
      prisma.consecutive.upsert.mockResolvedValue({
        type: 'ORDER',
        prefix: 'OP',
        year: 2025,
        lastNumber: 1,
      });

      const result = await repository.getNextNumber('ORDER', 'OP', 2025);

      expect(result).toBe('OP-2025-0001');
    });
  });

  // ---------------------------------------------------------------------------
  // findAll
  // ---------------------------------------------------------------------------
  describe('findAll', () => {
    it('should return all consecutives ordered by type asc', async () => {
      const mockData = [
        { type: 'ORDER', prefix: 'OP', year: CURRENT_YEAR, lastNumber: 10 },
        { type: 'QUOTE', prefix: 'COT', year: CURRENT_YEAR, lastNumber: 5 },
      ];
      prisma.consecutive.findMany.mockResolvedValue(mockData);

      const result = await repository.findAll();

      expect(prisma.consecutive.findMany).toHaveBeenCalledWith({ orderBy: { type: 'asc' } });
      expect(result).toEqual(mockData);
    });
  });

  // ---------------------------------------------------------------------------
  // reset
  // ---------------------------------------------------------------------------
  describe('reset', () => {
    it('should update lastNumber to 0 for the given type', async () => {
      const resetRecord = { type: 'ORDER', lastNumber: 0 };
      prisma.consecutive.update.mockResolvedValue(resetRecord);

      const result = await repository.reset('ORDER');

      expect(prisma.consecutive.update).toHaveBeenCalledWith({
        where: { type: 'ORDER' },
        data: { lastNumber: 0 },
      });
      expect(result).toEqual(resetRecord);
    });
  });
});
