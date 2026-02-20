import { Test, TestingModule } from '@nestjs/testing';
import { ConsecutivesService } from './consecutives.service';
import { ConsecutivesRepository } from './consecutives.repository';

const mockConsecutivesRepository = {
  getNextNumber: jest.fn(),
  findAll: jest.fn(),
  reset: jest.fn(),
};

describe('ConsecutivesService', () => {
  let service: ConsecutivesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConsecutivesService,
        { provide: ConsecutivesRepository, useValue: mockConsecutivesRepository },
      ],
    }).compile();

    service = module.get<ConsecutivesService>(ConsecutivesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ─────────────────────────────────────────────
  // generateNumber
  // ─────────────────────────────────────────────
  describe('generateNumber', () => {
    it('should call repository with correct prefix for ORDER type', async () => {
      const currentYear = new Date().getFullYear();
      mockConsecutivesRepository.getNextNumber.mockResolvedValue(`OP-${currentYear}-0001`);

      const result = await service.generateNumber('ORDER');

      expect(mockConsecutivesRepository.getNextNumber).toHaveBeenCalledWith(
        'ORDER',
        'OP',
        currentYear,
      );
      expect(result).toBe(`OP-${currentYear}-0001`);
    });

    it('should call repository with correct prefix for PRODUCTION type', async () => {
      const currentYear = new Date().getFullYear();
      mockConsecutivesRepository.getNextNumber.mockResolvedValue(`PROD-${currentYear}-0001`);

      const result = await service.generateNumber('PRODUCTION');

      expect(mockConsecutivesRepository.getNextNumber).toHaveBeenCalledWith(
        'PRODUCTION',
        'PROD',
        currentYear,
      );
      expect(result).toBe(`PROD-${currentYear}-0001`);
    });

    it('should call repository with correct prefix for EXPENSE type', async () => {
      const currentYear = new Date().getFullYear();
      mockConsecutivesRepository.getNextNumber.mockResolvedValue(`GAS-${currentYear}-0001`);

      const result = await service.generateNumber('EXPENSE');

      expect(mockConsecutivesRepository.getNextNumber).toHaveBeenCalledWith(
        'EXPENSE',
        'GAS',
        currentYear,
      );
      expect(result).toBe(`GAS-${currentYear}-0001`);
    });

    it('should call repository with correct prefix for QUOTE type', async () => {
      const currentYear = new Date().getFullYear();
      mockConsecutivesRepository.getNextNumber.mockResolvedValue(`COT-${currentYear}-0001`);

      const result = await service.generateNumber('QUOTE');

      expect(mockConsecutivesRepository.getNextNumber).toHaveBeenCalledWith(
        'QUOTE',
        'COT',
        currentYear,
      );
      expect(result).toBe(`COT-${currentYear}-0001`);
    });

    it('should pass the current calendar year to the repository', async () => {
      const currentYear = new Date().getFullYear();
      mockConsecutivesRepository.getNextNumber.mockResolvedValue(`OP-${currentYear}-0005`);

      await service.generateNumber('ORDER');

      const callArgs = mockConsecutivesRepository.getNextNumber.mock.calls[0];
      expect(callArgs[2]).toBe(currentYear);
    });

    it('should return the formatted string from the repository unchanged', async () => {
      const formatted = 'COT-2026-0042';
      mockConsecutivesRepository.getNextNumber.mockResolvedValue(formatted);

      const result = await service.generateNumber('QUOTE');

      expect(result).toBe(formatted);
    });
  });

  // ─────────────────────────────────────────────
  // findAll
  // ─────────────────────────────────────────────
  describe('findAll', () => {
    it('should delegate to repository.findAll', async () => {
      const mockData = [
        { type: 'ORDER', prefix: 'OP', year: 2026, lastNumber: 5 },
        { type: 'QUOTE', prefix: 'COT', year: 2026, lastNumber: 2 },
      ];
      mockConsecutivesRepository.findAll.mockResolvedValue(mockData);

      const result = await service.findAll();

      expect(mockConsecutivesRepository.findAll).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockData);
    });
  });

  // ─────────────────────────────────────────────
  // reset
  // ─────────────────────────────────────────────
  describe('reset', () => {
    it('should delegate reset to the repository with the given type', async () => {
      mockConsecutivesRepository.reset.mockResolvedValue({ type: 'ORDER', lastNumber: 0 });

      const result = await service.reset('ORDER');

      expect(mockConsecutivesRepository.reset).toHaveBeenCalledWith('ORDER');
      expect(result).toMatchObject({ type: 'ORDER', lastNumber: 0 });
    });

    it('should pass the exact type string to the repository', async () => {
      mockConsecutivesRepository.reset.mockResolvedValue({});

      await service.reset('QUOTE');

      expect(mockConsecutivesRepository.reset).toHaveBeenCalledWith('QUOTE');
    });
  });
});
