import { Module } from '@nestjs/common';
import { DiscountApprovalsController } from './discount-approvals.controller';
import { DiscountApprovalsService } from './discount-approvals.service';
import { DatabaseModule } from '../../database/database.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { WhatsappModule } from '../whatsapp/whatsapp.module';

@Module({
  imports: [DatabaseModule, NotificationsModule, WhatsappModule],
  controllers: [DiscountApprovalsController],
  providers: [DiscountApprovalsService],
  exports: [DiscountApprovalsService],
})
export class DiscountApprovalsModule {}
