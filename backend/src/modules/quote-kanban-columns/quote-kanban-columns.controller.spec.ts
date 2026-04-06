import { Test, TestingModule } from '@nestjs/testing';
import { QuoteKanbanColumnsController } from './quote-kanban-columns.controller';
import { QuoteKanbanColumnsService } from './quote-kanban-columns.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { PrismaService } from '../../database/prisma.service';

describe('QuoteKanbanColumnsController', () => {
  let controller: QuoteKanbanColumnsController;
  let service: QuoteKanbanColumnsService;

  const mockService = {
    findAll: jest.fn(),
    findAllIncludingInactive: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    reorder: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [QuoteKanbanColumnsController],
      providers: [
        {
          provide: PrismaService,
          useValue: { user: { findUnique: jest.fn() } },
        },
        {
          provide: QuoteKanbanColumnsService,
          useValue: mockService,
        },
      ],
    }).compile();

    controller = module.get<QuoteKanbanColumnsController>(QuoteKanbanColumnsController);
    service = module.get<QuoteKanbanColumnsService>(QuoteKanbanColumnsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('findAll', () => {
    controller.findAll();
    expect(service.findAll).toHaveBeenCalled();
  });

  it('findAllIncludingInactive', () => {
    controller.findAllIncludingInactive();
    expect(service.findAllIncludingInactive).toHaveBeenCalled();
  });

  it('findOne', () => {
    controller.findOne('1');
    expect(service.findOne).toHaveBeenCalledWith('1');
  });

  it('create', () => {
    const dto = { name: 'Test', order: 1 } as any;
    controller.create(dto);
    expect(service.create).toHaveBeenCalledWith(dto);
  });

  it('reorder', () => {
    const dto = { columns: [] };
    controller.reorder(dto);
    expect(service.reorder).toHaveBeenCalledWith(dto);
  });

  it('update', () => {
    const dto = { name: 'Test' };
    controller.update('1', dto);
    expect(service.update).toHaveBeenCalledWith('1', dto);
  });

  it('remove', () => {
    controller.remove('1');
    expect(service.remove).toHaveBeenCalledWith('1');
  });
});
