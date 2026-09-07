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

    // El contador de `consecutives` es una caché que puede quedar por detrás de
    // los datos reales (siembra, inserción manual, restauración de backup), y
    // entonces devolvía un número ya usado → P2002 al crear. Con `source` el
    // incremento se toma contra el máximo real de la tabla.
    describe('con tabla de origen (source)', () => {
      it('should take the max from the target table instead of the counter', async () => {
        (prisma.$queryRawUnsafe as jest.Mock).mockResolvedValue([
          { last_number: 2780 },
        ]);

        const result = await repository.getNextNumber(
          'ORDER',
          'OP',
          CURRENT_YEAR,
          { table: 'orders', column: 'order_number' },
        );

        expect(prisma.$queryRawUnsafe).toHaveBeenCalled();
        // El contador atómico simple no se usa cuando hay tabla de origen.
        expect(prisma.$queryRaw).not.toHaveBeenCalled();
        expect(result).toBe(`OP-${CURRENT_YEAR}-2780`);
      });

      it('should scope the max to the prefix and year of this consecutive', async () => {
        (prisma.$queryRawUnsafe as jest.Mock).mockResolvedValue([
          { last_number: 1 },
        ]);

        await repository.getNextNumber('DTF_UV', 'DTF-UV', 2026, {
          table: 'dtf_records',
          column: 'consecutive',
        });

        const [sql, type, prefix, year, pattern] = (
          prisma.$queryRawUnsafe as jest.Mock
        ).mock.calls[0];

        expect(type).toBe('DTF_UV');
        expect(prefix).toBe('DTF-UV');
        expect(year).toBe(2026);
        // `dtf_records` guarda los dos tipos de DTF: el patrón es lo único que
        // los separa.
        expect(pattern).toBe('DTF-UV-2026-%');
        expect(sql).toContain('GREATEST');
      });

      it('should sanitize table and column names before interpolating them', async () => {
        (prisma.$queryRawUnsafe as jest.Mock).mockResolvedValue([
          { last_number: 1 },
        ]);

        await repository.getNextNumber('ORDER', 'OP', CURRENT_YEAR, {
          table: 'orders"; DROP TABLE users; --',
          column: 'order_number',
        });

        const [sql] = (prisma.$queryRawUnsafe as jest.Mock).mock.calls[0];

        expect(sql).not.toContain('DROP TABLE');
        expect(sql).toContain('"ordersDROPTABLEusers"');
      });

      it('should keep using the plain counter when the type has no source table', async () => {
        (prisma.$queryRaw as jest.Mock).mockResolvedValue([{ last_number: 3 }]);

        const result = await repository.getNextNumber('PRODUCTION', 'PROD');

        expect(prisma.$queryRaw).toHaveBeenCalled();
        expect(prisma.$queryRawUnsafe).not.toHaveBeenCalled();
        expect(result).toBe(`PROD-${CURRENT_YEAR}-0003`);
      });
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
