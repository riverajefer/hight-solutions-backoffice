import { Module, forwardRef } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { WhatsappModule } from '../whatsapp/whatsapp.module';
import { AccountsPayableModule } from '../accounts-payable/accounts-payable.module';
import { AccountsPayableAuthRequestsController } from './accounts-payable-auth-requests.controller';
import { AccountsPayableAuthRequestsService } from './accounts-payable-auth-requests.service';

@Module({
  imports: [
    DatabaseModule,
    NotificationsModule,
    WhatsappModule,
    forwardRef(() => AccountsPayableModule),
  ],
  controllers: [AccountsPayableAuthRequestsController],
  providers: [AccountsPayableAuthRequestsService],
  exports: [AccountsPayableAuthRequestsService],
})
export class AccountsPayableAuthRequestsModule {}
