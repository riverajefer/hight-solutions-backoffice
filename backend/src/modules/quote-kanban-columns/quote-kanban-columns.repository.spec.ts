import { Test, TestingModule } from '@nestjs/testing';
import { QuoteKanbanColumnsRepository } from './quote-kanban-columns.repository';
import { PrismaService } from '../../database/prisma.service';

describe('QuoteKanbanColumnsRepository', () => {
  let repository: QuoteKanbanColumnsRepository;
  let prisma: PrismaService;

  const mockPrisma = {
    quoteKanbanColumn: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QuoteKanbanColumnsRepository,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
      ],
    }).compile();

    repository = module.get<QuoteKanbanColumnsRepository>(QuoteKanbanColumnsRepository);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('findAll', async () => {
    mockPrisma.quoteKanbanColumn.findMany.mockResolvedValueOnce([]);
    const res = await repository.findAll();
    expect(res).toEqual([]);
    expect(mockPrisma.quoteKanbanColumn.findMany).toHaveBeenCalledWith({ where: { isActive: true }, orderBy: { displayOrder: 'asc' } });
  });

  it('findAllIncludingInactive', async () => {
    mockPrisma.quoteKanbanColumn.findMany.mockResolvedValueOnce([]);
    const res = await repository.findAllIncludingInactive();
    expect(res).toEqual([]);
    expect(mockPrisma.quoteKanbanColumn.findMany).toHaveBeenCalledWith({ orderBy: { displayOrder: 'asc' } });
  });

  it('findById', async () => {
    mockPrisma.quoteKanbanColumn.findUnique.mockResolvedValueOnce({ id: '1' });
    const res = await repository.findById('1');
    expect(res).toEqual({ id: '1' });
    expect(mockPrisma.quoteKanbanColumn.findUnique).toHaveBeenCalledWith({ where: { id: '1' } });
  });

  it('findByStatus', async () => {
    mockPrisma.quoteKanbanColumn.findFirst.mockResolvedValueOnce({ mappedStatus: 'SENT' });
    const res = await repository.findByStatus('SENT' as any);
    expect(res).toEqual({ mappedStatus: 'SENT' });
    expect(mockPrisma.quoteKanbanColumn.findFirst).toHaveBeenCalledWith({ where: { mappedStatus: 'SENT' } });
  });

  it('create', async () => {
    const dto = { name: 'Test' } as any;
    mockPrisma.quoteKanbanColumn.create.mockResolvedValueOnce(dto);
    const res = await repository.create(dto);
    expect(res).toEqual(dto);
    expect(mockPrisma.quoteKanbanColumn.create).toHaveBeenCalledWith({ data: dto });
  });

  it('update', async () => {
    const dto = { name: 'Test' } as any;
    mockPrisma.quoteKanbanColumn.update.mockResolvedValueOnce({ id: '1', ...dto });
    const res = await repository.update('1', dto);
    expect(res).toEqual({ id: '1', ...dto });
    expect(mockPrisma.quoteKanbanColumn.update).toHaveBeenCalledWith({ where: { id: '1' }, data: dto });
  });

  it('delete', async () => {
    mockPrisma.quoteKanbanColumn.delete.mockResolvedValueOnce({ id: '1' });
    const res = await repository.delete('1');
    expect(res).toEqual({ id: '1' });
    expect(mockPrisma.quoteKanbanColumn.delete).toHaveBeenCalledWith({ where: { id: '1' } });
  });

  it('reorder', async () => {
    const fn = jest.fn();
    mockPrisma.quoteKanbanColumn.update.mockImplementation(fn);
    await repository.reorder([{ id: '1', displayOrder: 2 }]);
    expect(mockPrisma.$transaction).toHaveBeenCalled();
  });
});
