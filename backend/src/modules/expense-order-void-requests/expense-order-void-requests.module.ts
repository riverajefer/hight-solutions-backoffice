import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { WhatsappModule } from '../whatsapp/whatsapp.module';
import { SupplyLotsModule } from '../supply-lots/supply-lots.module';
import { ExpenseOrderVoidRequestsController } from './expense-order-void-requests.controller';
import { ExpenseOrderVoidRequestsGlobalController } from './expense-order-void-requests-global.controller';
import { ExpenseOrderVoidRequestsService } from './expense-order-void-requests.service';

@Module({
  imports: [DatabaseModule, NotificationsModule, WhatsappModule, SupplyLotsModule],
  controllers: [ExpenseOrderVoidRequestsController, ExpenseOrderVoidRequestsGlobalController],
  providers: [ExpenseOrderVoidRequestsService],
  exports: [ExpenseOrderVoidRequestsService],
})
export class ExpenseOrderVoidRequestsModule {}
