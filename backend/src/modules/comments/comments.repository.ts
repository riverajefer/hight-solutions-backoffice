import { Injectable } from '@nestjs/common';
import { CommentEntityType } from '../../generated/prisma';
import { PrismaService } from '../../database/prisma.service';
import { CreateCommentDto } from './dto';

@Injectable()
export class CommentsRepository {
  constructor(private readonly prisma: PrismaService) {}

  private readonly authorSelect = {
    id: true,
    username: true,
    firstName: true,
    lastName: true,
    profilePhoto: true,
  } as const;

  private readonly replySelect = {
    id: true,
    content: true,
    parentId: true,
    deletedAt: true,
    createdAt: true,
    updatedAt: true,
  };

  async findByEntity(entityType: CommentEntityType, entityId: string) {
    return this.prisma.comment.findMany({
      where: {
        entityType,
        entityId,
        parentId: null,
        deletedAt: null,
      },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        content: true,
        entityType: true,
        entityId: true,
        parentId: true,
        deletedAt: true,
        createdAt: true,
        updatedAt: true,
        author: { select: this.authorSelect },
        replies: {
          where: { deletedAt: null },
          orderBy: { createdAt: 'asc' },
          select: {
            ...this.replySelect,
            author: { select: this.authorSelect },
          },
        },
      },
    });
  }

  async findById(id: string) {
    return this.prisma.comment.findUnique({
      where: { id },
      select: {
        id: true,
        authorId: true,
        parentId: true,
        deletedAt: true,
      },
    });
  }

  async userHasPermission(userId: string, permissionName: string): Promise<boolean> {
    const count = await this.prisma.rolePermission.count({
      where: {
        role: { users: { some: { id: userId } } },
        permission: { name: permissionName },
      },
    });
    return count > 0;
  }

  async create(authorId: string, dto: CreateCommentDto) {
    return this.prisma.comment.create({
      data: {
        content: dto.content,
        entityType: dto.entityType,
        entityId: dto.entityId,
        parentId: dto.parentId ?? null,
        authorId,
      },
      select: {
        id: true,
        content: true,
        entityType: true,
        entityId: true,
        parentId: true,
        deletedAt: true,
        createdAt: true,
        updatedAt: true,
        author: { select: this.authorSelect },
        replies: {
          select: {
            ...this.replySelect,
            author: { select: this.authorSelect },
          },
        },
      },
    });
  }

  async softDelete(id: string) {
    return this.prisma.comment.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        content: '[mensaje eliminado]',
      },
    });
  }

  async searchMentionableUsers(q: string, limit = 10) {
    const search = q.trim();
    return this.prisma.user.findMany({
      where: {
        isActive: true,
        ...(search && {
          OR: [
            { username: { contains: search, mode: 'insensitive' } },
            { firstName: { contains: search, mode: 'insensitive' } },
            { lastName: { contains: search, mode: 'insensitive' } },
          ],
        }),
      },
      select: {
        id: true,
        username: true,
        firstName: true,
        lastName: true,
        profilePhoto: true,
      },
      orderBy: { username: 'asc' },
      take: limit,
    });
  }
}
