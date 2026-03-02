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
    it('should call $queryRaw with atomic INSERT ON CONFLICT and return formatted number', async () => {
      (prisma.$queryRaw as jest.Mock).mockResolvedValue([{ last_number: 1 }]);

      const result = await repository.getNextNumber('ORDER', 'OP');

      expect(prisma.$queryRaw).toHaveBeenCalled();
      expect(result).toBe(`OP-${CURRENT_YEAR}-0001`);
    });

    it('should return formatted string with zero-padded number', async () => {
      (prisma.$queryRaw as jest.Mock).mockResolvedValue([{ last_number: 43 }]);

      const result = await repository.getNextNumber('ORDER', 'OP');

      expect(result).toBe(`OP-${CURRENT_YEAR}-0043`);
    });

    it('should pad numbers to 4 digits (e.g. 1 → "0001")', async () => {
      (prisma.$queryRaw as jest.Mock).mockResolvedValue([{ last_number: 1 }]);

      const result = await repository.getNextNumber('QUOTE', 'COT');

      expect(result).toMatch(/COT-\d{4}-0001/);
    });

    it('should use the provided year parameter when given', async () => {
      (prisma.$queryRaw as jest.Mock).mockResolvedValue([{ last_number: 1 }]);

      const result = await repository.getNextNumber('ORDER', 'OP', 2025);

      expect(result).toBe('OP-2025-0001');
    });

    it('should handle bigint values from PostgreSQL', async () => {
      (prisma.$queryRaw as jest.Mock).mockResolvedValue([{ last_number: BigInt(7) }]);

      const result = await repository.getNextNumber('ORDER', 'OP');

      expect(result).toBe(`OP-${CURRENT_YEAR}-0007`);
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
