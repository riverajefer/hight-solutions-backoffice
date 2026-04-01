import { Test, TestingModule } from '@nestjs/testing';
import { CommentsRepository } from './comments.repository';
import { PrismaService } from '../../database/prisma.service';
import { CommentEntityType } from '../../generated/prisma';

describe('CommentsRepository', () => {
  let repository: CommentsRepository;
  let prisma: PrismaService;

  const mockPrisma = {
    comment: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    rolePermission: {
      count: jest.fn(),
    },
    user: {
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CommentsRepository,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    repository = module.get<CommentsRepository>(CommentsRepository);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('findByEntity', () => {
    it('calls prisma.comment.findMany with correct where clause', async () => {
      mockPrisma.comment.findMany.mockResolvedValueOnce([]);
      const res = await repository.findByEntity(CommentEntityType.ORDER, 'e-1');
      expect(res).toEqual([]);
      expect(mockPrisma.comment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { entityType: CommentEntityType.ORDER, entityId: 'e-1', parentId: null, deletedAt: null },
          orderBy: { createdAt: 'asc' },
        }),
      );
    });
  });

  describe('findById', () => {
    it('calls prisma.comment.findUnique', async () => {
      mockPrisma.comment.findUnique.mockResolvedValueOnce({ id: 'c-1' });
      const res = await repository.findById('c-1');
      expect(res).toEqual({ id: 'c-1' });
      expect(mockPrisma.comment.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'c-1' } }),
      );
    });

    it('returns null when not found', async () => {
      mockPrisma.comment.findUnique.mockResolvedValueOnce(null);
      const res = await repository.findById('missing');
      expect(res).toBeNull();
    });
  });

  describe('userHasPermission', () => {
    it('returns true when count > 0', async () => {
      mockPrisma.rolePermission.count.mockResolvedValueOnce(1);
      const res = await repository.userHasPermission('user-1', 'delete_comments');
      expect(res).toBe(true);
    });

    it('returns false when count === 0', async () => {
      mockPrisma.rolePermission.count.mockResolvedValueOnce(0);
      const res = await repository.userHasPermission('user-1', 'delete_comments');
      expect(res).toBe(false);
    });
  });

  describe('create', () => {
    it('calls prisma.comment.create with correct data', async () => {
      const dto = {
        content: 'Hello',
        entityType: CommentEntityType.ORDER,
        entityId: 'e-1',
        parentId: undefined,
      };
      mockPrisma.comment.create.mockResolvedValueOnce({ id: 'c-new' });
      const res = await repository.create('user-1', dto);
      expect(res).toEqual({ id: 'c-new' });
      expect(mockPrisma.comment.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: {
            content: 'Hello',
            entityType: CommentEntityType.ORDER,
            entityId: 'e-1',
            parentId: null,
            authorId: 'user-1',
          },
        }),
      );
    });

    it('passes parentId when provided', async () => {
      const dto = {
        content: 'Reply',
        entityType: CommentEntityType.ORDER,
        entityId: 'e-1',
        parentId: 'parent-1',
      };
      mockPrisma.comment.create.mockResolvedValueOnce({ id: 'c-reply' });
      await repository.create('user-1', dto);
      expect(mockPrisma.comment.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ parentId: 'parent-1' }) }),
      );
    });
  });

  describe('softDelete', () => {
    it('calls prisma.comment.update with deletedAt and placeholder content', async () => {
      mockPrisma.comment.update.mockResolvedValueOnce({ id: 'c-1', deletedAt: expect.any(Date) });
      const res = await repository.softDelete('c-1');
      expect(mockPrisma.comment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'c-1' },
          data: { deletedAt: expect.any(Date), content: '[mensaje eliminado]' },
        }),
      );
    });
  });

  describe('searchMentionableUsers', () => {
    it('returns users matching the search term', async () => {
      mockPrisma.user.findMany.mockResolvedValueOnce([{ id: 'u-1', username: 'john' }]);
      const res = await repository.searchMentionableUsers('john');
      expect(res).toEqual([{ id: 'u-1', username: 'john' }]);
      expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ isActive: true }),
          take: 10,
        }),
      );
    });

    it('works with empty search string (returns all active users)', async () => {
      mockPrisma.user.findMany.mockResolvedValueOnce([]);
      const res = await repository.searchMentionableUsers('');
      expect(res).toEqual([]);
      expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { isActive: true } }),
      );
    });
  });
});
