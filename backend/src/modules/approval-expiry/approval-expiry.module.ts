import { Module } from '@nestjs/common';
import { ApprovalExpiryService } from './approval-expiry.service';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [NotificationsModule],
  providers: [ApprovalExpiryService],
  exports: [ApprovalExpiryService],
})
export class ApprovalExpiryModule {}
