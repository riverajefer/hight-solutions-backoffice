import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { QuoteKanbanColumnsRepository } from './quote-kanban-columns.repository';
import { CreateQuoteKanbanColumnDto } from './dto/create-quote-kanban-column.dto';
import { UpdateQuoteKanbanColumnDto } from './dto/update-quote-kanban-column.dto';
import { ReorderQuoteKanbanColumnsDto } from './dto/reorder-quote-kanban-columns.dto';
import { QuoteStatus } from '../../generated/prisma';

/** Columnas protegidas: no se pueden editar ni eliminar */
const PROTECTED_STATUSES: QuoteStatus[] = [QuoteStatus.DRAFT, QuoteStatus.CONVERTED];

const MAX_COLUMNS = 8;

@Injectable()
export class QuoteKanbanColumnsService {
  constructor(private readonly repository: QuoteKanbanColumnsRepository) {}

  findAll() {
    return this.repository.findAll();
  }

  findAllIncludingInactive() {
    return this.repository.findAllIncludingInactive();
  }

  async findOne(id: string) {
    const column = await this.repository.findById(id);
    if (!column) {
      throw new NotFoundException(`Columna Kanban con id ${id} no encontrada`);
    }
    return column;
  }

  async create(dto: CreateQuoteKanbanColumnDto) {
    const all = await this.repository.findAllIncludingInactive();
    if (all.length >= MAX_COLUMNS) {
      throw new BadRequestException(
        `Se ha alcanzado el límite máximo de ${MAX_COLUMNS} columnas en el tablero.`,
      );
    }
    return this.repository.create(dto);
  }

  async update(id: string, dto: UpdateQuoteKanbanColumnDto) {
    const column = await this.findOne(id);
    if (PROTECTED_STATUSES.includes(column.mappedStatus)) {
      throw new BadRequestException(
        `La columna "${column.name}" es del sistema y no puede ser modificada.`,
      );
    }
    return this.repository.update(id, dto);
  }

  async remove(id: string) {
    const column = await this.findOne(id);
    if (PROTECTED_STATUSES.includes(column.mappedStatus)) {
      throw new BadRequestException(
        `La columna "${column.name}" es del sistema y no puede ser eliminada.`,
      );
    }
    return this.repository.delete(id);
  }

  async reorder(dto: ReorderQuoteKanbanColumnsDto) {
    await this.repository.reorder(dto.columns);
    return this.repository.findAll();
  }
}
