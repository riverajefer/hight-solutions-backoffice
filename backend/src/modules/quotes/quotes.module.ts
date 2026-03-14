import { Module } from '@nestjs/common';
import { QuotesService } from './quotes.service';
import { QuotesController } from './quotes.controller';
import { QuotesRepository } from './quotes.repository';
import { ConsecutivesModule } from '../consecutives/consecutives.module';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [ConsecutivesModule, AuditLogsModule, StorageModule],
  controllers: [QuotesController],
  providers: [QuotesService, QuotesRepository],
  exports: [QuotesService],
})
export class QuotesModule {}
