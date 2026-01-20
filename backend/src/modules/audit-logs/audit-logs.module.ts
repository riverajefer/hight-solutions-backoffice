import { Module } from '@nestjs/common';
import { AuditLogsExampleController } from './audit-logs.example.controller';
import { DatabaseModule } from '../../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [AuditLogsExampleController],
})
export class AuditLogsModule {}
