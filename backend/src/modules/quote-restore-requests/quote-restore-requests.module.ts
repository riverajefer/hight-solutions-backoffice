import { Module } from '@nestjs/common';
import { QuoteRestoreRequestsController } from './quote-restore-requests.controller';
import { QuoteRestoreRequestsService } from './quote-restore-requests.service';
import { DatabaseModule } from '../../database/database.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [DatabaseModule, NotificationsModule],
  controllers: [QuoteRestoreRequestsController],
  providers: [QuoteRestoreRequestsService],
  exports: [QuoteRestoreRequestsService],
})
export class QuoteRestoreRequestsModule {}
