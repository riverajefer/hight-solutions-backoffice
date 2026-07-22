import { Module } from '@nestjs/common';
import { AdvisorChangeRequestsController } from './advisor-change-requests.controller';
import { AdvisorChangeRequestsService } from './advisor-change-requests.service';
import { DatabaseModule } from '../../database/database.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [DatabaseModule, NotificationsModule],
  controllers: [AdvisorChangeRequestsController],
  providers: [AdvisorChangeRequestsService],
  exports: [AdvisorChangeRequestsService],
})
export class AdvisorChangeRequestsModule {}
