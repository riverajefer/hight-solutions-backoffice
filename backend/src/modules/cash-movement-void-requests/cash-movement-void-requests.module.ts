import { Module, forwardRef } from '@nestjs/common';
import { CashMovementVoidRequestsController } from './cash-movement-void-requests.controller';
import { CashMovementVoidRequestsGlobalController } from './cash-movement-void-requests-global.controller';
import { CashMovementVoidRequestsService } from './cash-movement-void-requests.service';
import { DatabaseModule } from '../../database/database.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { WhatsappModule } from '../whatsapp/whatsapp.module';
import { CashMovementModule } from '../cash-movement/cash-movement.module';

@Module({
  imports: [
    DatabaseModule,
    NotificationsModule,
    WhatsappModule,
    forwardRef(() => CashMovementModule),
  ],
  controllers: [
    CashMovementVoidRequestsController,
    CashMovementVoidRequestsGlobalController,
  ],
  providers: [CashMovementVoidRequestsService],
  exports: [CashMovementVoidRequestsService],
})
export class CashMovementVoidRequestsModule {}
