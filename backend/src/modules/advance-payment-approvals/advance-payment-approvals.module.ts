import { Module } from '@nestjs/common';
import { AdvancePaymentApprovalsController } from './advance-payment-approvals.controller';
import { AdvancePaymentApprovalsService } from './advance-payment-approvals.service';
import { DatabaseModule } from '../../database/database.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [DatabaseModule, NotificationsModule],
  controllers: [AdvancePaymentApprovalsController],
  providers: [AdvancePaymentApprovalsService],
  exports: [AdvancePaymentApprovalsService],
})
export class AdvancePaymentApprovalsModule {}
