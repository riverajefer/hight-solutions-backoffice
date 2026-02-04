import { Module } from '@nestjs/common';
import { QuotesService } from './quotes.service';
import { QuotesController } from './quotes.controller';
import { QuotesRepository } from './quotes.repository';
import { ConsecutivesModule } from '../consecutives/consecutives.module';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';

@Module({
  imports: [ConsecutivesModule, AuditLogsModule],
  controllers: [QuotesController],
  providers: [QuotesService, QuotesRepository],
  exports: [QuotesService],
})
export class QuotesModule {}
