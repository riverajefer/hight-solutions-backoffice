import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { AccountsPayablePaymentReversalRequestsController } from './accounts-payable-payment-reversal-requests.controller';
import { AccountsPayablePaymentReversalRequestsService } from './accounts-payable-payment-reversal-requests.service';

@Module({
  imports: [DatabaseModule, NotificationsModule],
  controllers: [AccountsPayablePaymentReversalRequestsController],
  providers: [AccountsPayablePaymentReversalRequestsService],
  exports: [AccountsPayablePaymentReversalRequestsService],
})
export class AccountsPayablePaymentReversalRequestsModule {}
