import { Module } from '@nestjs/common';
import { AuditLogsController } from './audit-logs.controller';
import { AuditLogsService } from './audit-logs.service';
import { AuditLogsScheduler } from './audit-logs.scheduler';
import { DatabaseModule } from '../../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [AuditLogsController],
  providers: [AuditLogsService, AuditLogsScheduler],
  exports: [AuditLogsService],
})
export class AuditLogsModule {}
