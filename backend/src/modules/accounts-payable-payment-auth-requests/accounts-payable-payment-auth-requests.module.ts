import { Module, forwardRef } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { WhatsappModule } from '../whatsapp/whatsapp.module';
import { AccountsPayableModule } from '../accounts-payable/accounts-payable.module';
import { AccountsPayablePaymentAuthRequestsController } from './accounts-payable-payment-auth-requests.controller';
import { AccountsPayablePaymentAuthRequestsService } from './accounts-payable-payment-auth-requests.service';

@Module({
  imports: [
    DatabaseModule,
    NotificationsModule,
    WhatsappModule,
    forwardRef(() => AccountsPayableModule),
  ],
  controllers: [AccountsPayablePaymentAuthRequestsController],
  providers: [AccountsPayablePaymentAuthRequestsService],
  exports: [AccountsPayablePaymentAuthRequestsService],
})
export class AccountsPayablePaymentAuthRequestsModule {}
