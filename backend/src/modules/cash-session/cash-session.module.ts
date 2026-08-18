import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { ConsecutivesModule } from '../consecutives/consecutives.module';
import { CashSessionController } from './cash-session.controller';
import { CashSessionService } from './cash-session.service';
import { CashSessionRepository } from './cash-session.repository';
import { PendingCashEntriesService } from './pending-cash-entries.service';

@Module({
  imports: [DatabaseModule, AuditLogsModule, ConsecutivesModule],
  controllers: [CashSessionController],
  providers: [CashSessionService, CashSessionRepository, PendingCashEntriesService],
  exports: [CashSessionService, CashSessionRepository, PendingCashEntriesService],
})
export class CashSessionModule {}
