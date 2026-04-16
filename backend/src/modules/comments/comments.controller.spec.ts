import { Test, TestingModule } from '@nestjs/testing';
import { CommentsController } from './comments.controller';
import { CommentsService } from './comments.service';
import { PrismaService } from '../../database/prisma.service';
import { CreateCommentDto, FilterCommentsDto } from './dto';
import { CommentEntityType } from '../../generated/prisma';

describe('CommentsController', () => {
  let controller: CommentsController;
  let service: CommentsService;

  const mockService = {
    findByEntity: jest.fn(),
    searchMentionableUsers: jest.fn(),
    create: jest.fn(),
    remove: jest.fn(),
  };

  const mockUser = { id: 'user-1', email: 'user@test.com' };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CommentsController],
      providers: [
        { provide: CommentsService, useValue: mockService },
        { provide: PrismaService, useValue: { user: { findUnique: jest.fn() } } },
      ],
    }).compile();

    controller = module.get<CommentsController>(CommentsController);
    service = module.get<CommentsService>(CommentsService);
  });

  afterEach(() => jest.clearAllMocks());

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findByEntity', () => {
    it('delegates to service.findByEntity', () => {
      const filters: FilterCommentsDto = { entityType: CommentEntityType.ORDER, entityId: 'e-1' };
      mockService.findByEntity.mockResolvedValueOnce([]);
      controller.findByEntity(filters);
      expect(service.findByEntity).toHaveBeenCalledWith(filters);
    });
  });

  describe('searchMentions', () => {
    it('delegates to service.searchMentionableUsers with provided q', () => {
      mockService.searchMentionableUsers.mockResolvedValueOnce([]);
      controller.searchMentions('john');
      expect(service.searchMentionableUsers).toHaveBeenCalledWith('john');
    });

    it('uses empty string when q is undefined', () => {
      mockService.searchMentionableUsers.mockResolvedValueOnce([]);
      controller.searchMentions(undefined as unknown as string);
      expect(service.searchMentionableUsers).toHaveBeenCalledWith('');
    });
  });

  describe('create', () => {
    it('delegates to service.create with user id', () => {
      const dto: CreateCommentDto = {
        content: 'Hello',
        entityType: CommentEntityType.ORDER,
        entityId: 'e-1',
      };
      mockService.create.mockResolvedValueOnce({ id: 'c-1' });
      controller.create(dto, mockUser as any);
      expect(service.create).toHaveBeenCalledWith('user-1', dto);
    });
  });

  describe('remove', () => {
    it('delegates to service.remove with user id', async () => {
      mockService.remove.mockResolvedValueOnce(undefined);
      await controller.remove('c-1', mockUser as any);
      expect(service.remove).toHaveBeenCalledWith('c-1', 'user-1');
    });
  });
});
