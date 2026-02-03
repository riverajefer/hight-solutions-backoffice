import { Module } from '@nestjs/common';
import { OrderEditRequestsController } from './order-edit-requests.controller';
import { OrderEditRequestsService } from './order-edit-requests.service';
import { OrderEditPermissionsExpireService } from './services/order-edit-permissions-expire.service';
import { DatabaseModule } from '../../database/database.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [DatabaseModule, NotificationsModule],
  controllers: [OrderEditRequestsController],
  providers: [
    OrderEditRequestsService,
    OrderEditPermissionsExpireService,
  ],
  exports: [OrderEditRequestsService],
})
export class OrderEditRequestsModule {}
