import { Module } from '@nestjs/common';
import { ClientOwnershipAuthRequestsController } from './client-ownership-auth-requests.controller';
import { ClientOwnershipAuthRequestsService } from './client-ownership-auth-requests.service';
import { DatabaseModule } from '../../database/database.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [DatabaseModule, NotificationsModule],
  controllers: [ClientOwnershipAuthRequestsController],
  providers: [ClientOwnershipAuthRequestsService],
  exports: [ClientOwnershipAuthRequestsService],
})
export class ClientOwnershipAuthRequestsModule {}
