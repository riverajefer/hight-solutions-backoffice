import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { WhatsappModule } from '../whatsapp/whatsapp.module';
import { CashMovementTransferRequestsController } from './cash-movement-transfer-requests.controller';
import { CashMovementTransferRequestsGlobalController } from './cash-movement-transfer-requests-global.controller';
import { CashMovementTransferRequestsService } from './cash-movement-transfer-requests.service';

@Module({
  imports: [DatabaseModule, NotificationsModule, WhatsappModule],
  controllers: [CashMovementTransferRequestsController, CashMovementTransferRequestsGlobalController],
  providers: [CashMovementTransferRequestsService],
  exports: [CashMovementTransferRequestsService],
})
export class CashMovementTransferRequestsModule {}
