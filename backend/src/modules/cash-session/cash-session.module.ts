import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { CashSessionController } from './cash-session.controller';
import { CashSessionService } from './cash-session.service';
import { CashSessionRepository } from './cash-session.repository';

@Module({
  imports: [DatabaseModule, AuditLogsModule],
  controllers: [CashSessionController],
  providers: [CashSessionService, CashSessionRepository],
  exports: [CashSessionService, CashSessionRepository],
})
export class CashSessionModule {}
