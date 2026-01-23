import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { SessionLogsController } from './session-logs.controller';
import { SessionLogsService } from './session-logs.service';
import { SessionLogsRepository } from './session-logs.repository';

@Module({
  imports: [DatabaseModule],
  controllers: [SessionLogsController],
  providers: [SessionLogsService, SessionLogsRepository],
  exports: [SessionLogsService],
})
export class SessionLogsModule {}
