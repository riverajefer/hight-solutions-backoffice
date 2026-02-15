import { Module } from '@nestjs/common';
import { OrderStatusChangeRequestsController } from './order-status-change-requests.controller';
import { OrderStatusChangeRequestsService } from './order-status-change-requests.service';
import { DatabaseModule } from '../../database/database.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [DatabaseModule, NotificationsModule],
  controllers: [OrderStatusChangeRequestsController],
  providers: [OrderStatusChangeRequestsService],
  exports: [OrderStatusChangeRequestsService],
})
export class OrderStatusChangeRequestsModule {}
