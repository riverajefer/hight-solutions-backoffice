import { Module } from '@nestjs/common';
import { QuoteKanbanColumnsController } from './quote-kanban-columns.controller';
import { QuoteKanbanColumnsService } from './quote-kanban-columns.service';
import { QuoteKanbanColumnsRepository } from './quote-kanban-columns.repository';

@Module({
  controllers: [QuoteKanbanColumnsController],
  providers: [QuoteKanbanColumnsService, QuoteKanbanColumnsRepository],
  exports: [QuoteKanbanColumnsService],
})
export class QuoteKanbanColumnsModule {}
