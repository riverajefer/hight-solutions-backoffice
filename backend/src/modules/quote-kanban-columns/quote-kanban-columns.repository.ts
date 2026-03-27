import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateQuoteKanbanColumnDto } from './dto/create-quote-kanban-column.dto';
import { UpdateQuoteKanbanColumnDto } from './dto/update-quote-kanban-column.dto';
import { QuoteStatus } from '../../generated/prisma';

@Injectable()
export class QuoteKanbanColumnsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.quoteKanbanColumn.findMany({
      where: { isActive: true },
      orderBy: { displayOrder: 'asc' },
    });
  }

  findAllIncludingInactive() {
    return this.prisma.quoteKanbanColumn.findMany({
      orderBy: { displayOrder: 'asc' },
    });
  }

  findById(id: string) {
    return this.prisma.quoteKanbanColumn.findUnique({ where: { id } });
  }

  findByStatus(mappedStatus: QuoteStatus) {
    return this.prisma.quoteKanbanColumn.findFirst({ where: { mappedStatus } });
  }

  create(data: CreateQuoteKanbanColumnDto) {
    return this.prisma.quoteKanbanColumn.create({ data });
  }

  update(id: string, data: UpdateQuoteKanbanColumnDto) {
    return this.prisma.quoteKanbanColumn.update({ where: { id }, data });
  }

  delete(id: string) {
    return this.prisma.quoteKanbanColumn.delete({ where: { id } });
  }

  async reorder(columns: { id: string; displayOrder: number }[]) {
    await this.prisma.$transaction(
      columns.map(({ id, displayOrder }) =>
        this.prisma.quoteKanbanColumn.update({
          where: { id },
          data: { displayOrder },
        }),
      ),
    );
  }
}
