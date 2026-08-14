import { Module } from '@nestjs/common';
import { PaymentEditApprovalsController } from './payment-edit-approvals.controller';
import { PaymentEditApprovalsService } from './payment-edit-approvals.service';
import { DatabaseModule } from '../../database/database.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { WsEventsModule } from '../ws-events/ws-events.module';
import { StorageModule } from '../storage/storage.module';
import { CreditBalanceModule } from '../credit-balance/credit-balance.module';

@Module({
  imports: [DatabaseModule, NotificationsModule, WsEventsModule, StorageModule, CreditBalanceModule],
  controllers: [PaymentEditApprovalsController],
  providers: [PaymentEditApprovalsService],
  exports: [PaymentEditApprovalsService],
})
export class PaymentEditApprovalsModule {}
