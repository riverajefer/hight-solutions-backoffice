import { Test, TestingModule } from '@nestjs/testing';
import { QuoteKanbanColumnsService } from './quote-kanban-columns.service';
import { QuoteKanbanColumnsRepository } from './quote-kanban-columns.repository';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { QuoteStatus } from '../../generated/prisma';

describe('QuoteKanbanColumnsService', () => {
  let service: QuoteKanbanColumnsService;
  let repository: QuoteKanbanColumnsRepository;

  const mockRepository = {
    findAll: jest.fn(),
    findAllIncludingInactive: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    reorder: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QuoteKanbanColumnsService,
        {
          provide: QuoteKanbanColumnsRepository,
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<QuoteKanbanColumnsService>(QuoteKanbanColumnsService);
    repository = module.get<QuoteKanbanColumnsRepository>(QuoteKanbanColumnsRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findAll and findAllIncludingInactive', () => {
    it('findAll calls repo', () => {
      service.findAll();
      expect(repository.findAll).toHaveBeenCalled();
    });
    it('findAllIncludingInactive calls repo', () => {
      service.findAllIncludingInactive();
      expect(repository.findAllIncludingInactive).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('throws NotFoundException if not found', async () => {
      mockRepository.findById.mockResolvedValueOnce(null);
      await expect(service.findOne('uuid')).rejects.toThrow(NotFoundException);
    });

    it('returns column if found', async () => {
      const col = { id: 'uuid', name: 'col' };
      mockRepository.findById.mockResolvedValueOnce(col);
      const res = await service.findOne('uuid');
      expect(res).toEqual(col);
    });
  });

  describe('create', () => {
    it('throws BadRequestException if over limit', async () => {
      const limitCols = Array.from({ length: 8 }, (_, i) => ({ id: i }));
      mockRepository.findAllIncludingInactive.mockResolvedValueOnce(limitCols);
      await expect(service.create({ name: 'x', order: 1, mappedStatus: 'SENT' } as any)).rejects.toThrow(BadRequestException);
    });

    it('creates successfully', async () => {
      mockRepository.findAllIncludingInactive.mockResolvedValueOnce([]);
      const col = { id: 'new', name: 'x' };
      mockRepository.create.mockResolvedValueOnce(col);
      const res = await service.create({ name: 'x', order: 1, mappedStatus: 'SENT' } as any);
      expect(res).toEqual(col);
    });
  });

  describe('update', () => {
    it('throws BadRequestException if column is protected', async () => {
      mockRepository.findById.mockResolvedValueOnce({ id: '1', mappedStatus: QuoteStatus.DRAFT, name: 'draft' });
      await expect(service.update('1', { name: 'new' })).rejects.toThrow(BadRequestException);
    });

    it('updates successfully if not protected', async () => {
      mockRepository.findById.mockResolvedValueOnce({ id: '1', mappedStatus: QuoteStatus.SENT, name: 'sent' });
      mockRepository.update.mockResolvedValueOnce({ id: '1', name: 'new' });
      const res = await service.update('1', { name: 'new' });
      expect(repository.update).toHaveBeenCalledWith('1', { name: 'new' });
      expect(res).toEqual({ id: '1', name: 'new' });
    });
  });

  describe('remove', () => {
    it('throws BadRequestException if column is protected', async () => {
      mockRepository.findById.mockResolvedValueOnce({ id: '1', mappedStatus: QuoteStatus.CONVERTED, name: 'converted' });
      await expect(service.remove('1')).rejects.toThrow(BadRequestException);
    });

    it('deletes successfully if not protected', async () => {
      mockRepository.findById.mockResolvedValueOnce({ id: '1', mappedStatus: QuoteStatus.SENT, name: 'sent' });
      mockRepository.delete.mockResolvedValueOnce({ id: '1' });
      const res = await service.remove('1');
      expect(repository.delete).toHaveBeenCalledWith('1');
      expect(res).toEqual({ id: '1' });
    });
  });

  describe('reorder', () => {
    it('calls reorder and returns findAll', async () => {
      mockRepository.reorder.mockResolvedValueOnce(undefined);
      mockRepository.findAll.mockResolvedValueOnce([{ id: '1' }]);
      const res = await service.reorder({ columns: [{ id: '1', displayOrder: 1 }] });
      expect(repository.reorder).toHaveBeenCalledWith([{ id: '1', displayOrder: 1 }]);
      expect(repository.findAll).toHaveBeenCalled();
      expect(res).toEqual([{ id: '1' }]);
    });
  });
});
