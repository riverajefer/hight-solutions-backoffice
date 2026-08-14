import { Module } from '@nestjs/common';
import { AdvancePaymentApprovalsController } from './advance-payment-approvals.controller';
import { AdvancePaymentApprovalsService } from './advance-payment-approvals.service';
import { DatabaseModule } from '../../database/database.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { WsEventsModule } from '../ws-events/ws-events.module';
import { CreditBalanceModule } from '../credit-balance/credit-balance.module';

@Module({
  imports: [DatabaseModule, NotificationsModule, WsEventsModule, CreditBalanceModule],
  controllers: [AdvancePaymentApprovalsController],
  providers: [AdvancePaymentApprovalsService],
  exports: [AdvancePaymentApprovalsService],
})
export class AdvancePaymentApprovalsModule {}
