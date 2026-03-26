import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CommentsRepository } from './comments.repository';
import { CreateCommentDto, FilterCommentsDto } from './dto';

@Injectable()
export class CommentsService {
  constructor(private readonly repository: CommentsRepository) {}

  async findByEntity(dto: FilterCommentsDto) {
    return this.repository.findByEntity(dto.entityType, dto.entityId);
  }

  async create(authorId: string, dto: CreateCommentDto) {
    if (dto.parentId) {
      const parent = await this.repository.findById(dto.parentId);
      if (!parent) {
        throw new NotFoundException(`Comentario padre con id ${dto.parentId} no encontrado`);
      }
      if (parent.deletedAt) {
        throw new BadRequestException('No se puede responder a un comentario eliminado');
      }
      if (parent.parentId !== null) {
        throw new BadRequestException(
          'No se permiten respuestas a respuestas (máximo 1 nivel de profundidad)',
        );
      }
    }
    return this.repository.create(authorId, dto);
  }

  async searchMentionableUsers(q: string) {
    return this.repository.searchMentionableUsers(q);
  }

  async remove(id: string, requestingUserId: string) {
    const comment = await this.repository.findById(id);

    if (!comment) {
      throw new NotFoundException(`Comentario con id ${id} no encontrado`);
    }

    if (comment.deletedAt) {
      throw new BadRequestException('El comentario ya fue eliminado');
    }

    const isOwner = comment.authorId === requestingUserId;

    if (!isOwner) {
      const canDeleteAny = await this.repository.userHasPermission(
        requestingUserId,
        'delete_comments',
      );
      if (!canDeleteAny) {
        throw new ForbiddenException('No tienes permiso para eliminar este comentario');
      }
    }

    return this.repository.softDelete(id);
  }
}
