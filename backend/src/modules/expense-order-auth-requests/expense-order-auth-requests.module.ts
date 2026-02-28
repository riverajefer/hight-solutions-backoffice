import { Module } from '@nestjs/common';
import { ExpenseOrderAuthRequestsController } from './expense-order-auth-requests.controller';
import { ExpenseOrderAuthRequestsService } from './expense-order-auth-requests.service';
import { DatabaseModule } from '../../database/database.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [DatabaseModule, NotificationsModule],
  controllers: [ExpenseOrderAuthRequestsController],
  providers: [ExpenseOrderAuthRequestsService],
  exports: [ExpenseOrderAuthRequestsService],
})
export class ExpenseOrderAuthRequestsModule {}
