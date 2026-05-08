import { Module } from '@nestjs/common';
import { RefundRequestsController } from './refund-requests.controller';
import { RefundRequestsService } from './refund-requests.service';
import { DatabaseModule } from '../../database/database.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { WsEventsModule } from '../ws-events/ws-events.module';
import { ConsecutivesModule } from '../consecutives/consecutives.module';

@Module({
  imports: [
    DatabaseModule,
    NotificationsModule,
    WsEventsModule,
    ConsecutivesModule,
  ],
  controllers: [RefundRequestsController],
  providers: [RefundRequestsService],
  exports: [RefundRequestsService],
})
export class RefundRequestsModule {}
