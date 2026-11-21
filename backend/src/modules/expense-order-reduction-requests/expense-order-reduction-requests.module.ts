import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { WhatsappModule } from '../whatsapp/whatsapp.module';
import { AccountsPayableModule } from '../accounts-payable/accounts-payable.module';
import { ConsecutivesModule } from '../consecutives/consecutives.module';
import { ExpenseOrderReductionRequestsController } from './expense-order-reduction-requests.controller';
import { ExpenseOrderReductionRequestsGlobalController } from './expense-order-reduction-requests-global.controller';
import { ExpenseOrderReductionRequestsService } from './expense-order-reduction-requests.service';

@Module({
  imports: [
    DatabaseModule,
    NotificationsModule,
    WhatsappModule,
    AccountsPayableModule,
    ConsecutivesModule,
  ],
  controllers: [
    ExpenseOrderReductionRequestsController,
    ExpenseOrderReductionRequestsGlobalController,
  ],
  providers: [ExpenseOrderReductionRequestsService],
})
export class ExpenseOrderReductionRequestsModule {}
