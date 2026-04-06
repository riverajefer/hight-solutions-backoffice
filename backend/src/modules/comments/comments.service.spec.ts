import { Test, TestingModule } from '@nestjs/testing';
import { CommentsService } from './comments.service';
import { CommentsRepository } from './comments.repository';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { CommentEntityType } from '../../generated/prisma';

describe('CommentsService', () => {
  let service: CommentsService;
  let repository: CommentsRepository;

  const mockRepository = {
    findByEntity: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
    softDelete: jest.fn(),
    searchMentionableUsers: jest.fn(),
    userHasPermission: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CommentsService,
        { provide: CommentsRepository, useValue: mockRepository },
      ],
    }).compile();

    service = module.get<CommentsService>(CommentsService);
    repository = module.get<CommentsRepository>(CommentsRepository);
  });

  afterEach(() => jest.clearAllMocks());

  describe('findByEntity', () => {
    it('delegates to repository', async () => {
      mockRepository.findByEntity.mockResolvedValueOnce([]);
      const result = await service.findByEntity({ entityType: CommentEntityType.ORDER, entityId: 'e-1' });
      expect(repository.findByEntity).toHaveBeenCalledWith(CommentEntityType.ORDER, 'e-1');
      expect(result).toEqual([]);
    });
  });

  describe('create', () => {
    it('creates a root comment (no parentId)', async () => {
      const dto = { content: 'Hello', entityType: CommentEntityType.ORDER, entityId: 'e-1' };
      mockRepository.create.mockResolvedValueOnce({ id: 'c-1' });
      const res = await service.create('user-1', dto);
      expect(repository.create).toHaveBeenCalledWith('user-1', dto);
      expect(res).toEqual({ id: 'c-1' });
    });

    it('throws NotFoundException when parentId references nonexistent comment', async () => {
      mockRepository.findById.mockResolvedValueOnce(null);
      await expect(
        service.create('user-1', { content: 'Reply', entityType: CommentEntityType.ORDER, entityId: 'e-1', parentId: 'parent-999' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException when parent is deleted', async () => {
      mockRepository.findById.mockResolvedValueOnce({ id: 'parent-1', parentId: null, deletedAt: new Date() });
      await expect(
        service.create('user-1', { content: 'Reply', entityType: CommentEntityType.ORDER, entityId: 'e-1', parentId: 'parent-1' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException when parent is itself a reply', async () => {
      mockRepository.findById.mockResolvedValueOnce({ id: 'parent-1', parentId: 'grandparent-1', deletedAt: null });
      await expect(
        service.create('user-1', { content: 'Reply', entityType: CommentEntityType.ORDER, entityId: 'e-1', parentId: 'parent-1' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('creates a valid reply', async () => {
      mockRepository.findById.mockResolvedValueOnce({ id: 'parent-1', parentId: null, deletedAt: null });
      mockRepository.create.mockResolvedValueOnce({ id: 'c-2', parentId: 'parent-1' });
      const res = await service.create('user-1', {
        content: 'Reply',
        entityType: CommentEntityType.ORDER,
        entityId: 'e-1',
        parentId: 'parent-1',
      });
      expect(res).toEqual({ id: 'c-2', parentId: 'parent-1' });
    });
  });

  describe('searchMentionableUsers', () => {
    it('delegates to repository', async () => {
      mockRepository.searchMentionableUsers.mockResolvedValueOnce([{ id: 'u-1' }]);
      const res = await service.searchMentionableUsers('john');
      expect(repository.searchMentionableUsers).toHaveBeenCalledWith('john');
      expect(res).toEqual([{ id: 'u-1' }]);
    });
  });

  describe('remove', () => {
    it('throws NotFoundException when comment not found', async () => {
      mockRepository.findById.mockResolvedValueOnce(null);
      await expect(service.remove('c-1', 'user-1')).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException when comment is already deleted', async () => {
      mockRepository.findById.mockResolvedValueOnce({ id: 'c-1', authorId: 'user-1', deletedAt: new Date() });
      await expect(service.remove('c-1', 'user-1')).rejects.toThrow(BadRequestException);
    });

    it('allows owner to delete their own comment', async () => {
      mockRepository.findById.mockResolvedValueOnce({ id: 'c-1', authorId: 'user-1', deletedAt: null });
      mockRepository.softDelete.mockResolvedValueOnce({ id: 'c-1', deletedAt: new Date() });
      const res = await service.remove('c-1', 'user-1');
      expect(repository.softDelete).toHaveBeenCalledWith('c-1');
      expect(res).toEqual({ id: 'c-1', deletedAt: expect.any(Date) });
    });

    it('throws ForbiddenException when non-owner lacks delete_comments permission', async () => {
      mockRepository.findById.mockResolvedValueOnce({ id: 'c-1', authorId: 'other-user', deletedAt: null });
      mockRepository.userHasPermission.mockResolvedValueOnce(false);
      await expect(service.remove('c-1', 'user-1')).rejects.toThrow(ForbiddenException);
      expect(repository.userHasPermission).toHaveBeenCalledWith('user-1', 'delete_comments');
    });

    it('allows non-owner with delete_comments permission to delete', async () => {
      mockRepository.findById.mockResolvedValueOnce({ id: 'c-1', authorId: 'other-user', deletedAt: null });
      mockRepository.userHasPermission.mockResolvedValueOnce(true);
      mockRepository.softDelete.mockResolvedValueOnce({ id: 'c-1', deletedAt: new Date() });
      const res = await service.remove('c-1', 'user-1');
      expect(repository.softDelete).toHaveBeenCalledWith('c-1');
      expect(res).toEqual({ id: 'c-1', deletedAt: expect.any(Date) });
    });
  });
});
