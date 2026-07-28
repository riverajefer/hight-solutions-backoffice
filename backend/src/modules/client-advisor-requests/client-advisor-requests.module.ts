import { Module } from '@nestjs/common';
import { ClientAdvisorRequestsController } from './client-advisor-requests.controller';
import { ClientAdvisorRequestsService } from './client-advisor-requests.service';
import { DatabaseModule } from '../../database/database.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [DatabaseModule, NotificationsModule],
  controllers: [ClientAdvisorRequestsController],
  providers: [ClientAdvisorRequestsService],
  exports: [ClientAdvisorRequestsService],
})
export class ClientAdvisorRequestsModule {}
