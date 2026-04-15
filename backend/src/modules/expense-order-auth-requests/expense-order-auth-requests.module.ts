import { Module, forwardRef } from '@nestjs/common';
import { ExpenseOrderAuthRequestsController } from './expense-order-auth-requests.controller';
import { ExpenseOrderAuthRequestsService } from './expense-order-auth-requests.service';
import { DatabaseModule } from '../../database/database.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { ExpenseOrdersModule } from '../expense-orders/expense-orders.module';

@Module({
  imports: [DatabaseModule, NotificationsModule, forwardRef(() => ExpenseOrdersModule)],
  controllers: [ExpenseOrderAuthRequestsController],
  providers: [ExpenseOrderAuthRequestsService],
  exports: [ExpenseOrderAuthRequestsService],
})
export class ExpenseOrderAuthRequestsModule {}
