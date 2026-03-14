import { Global, Module } from '@nestjs/common';
import { WhatsappService } from './whatsapp.service';
import { WhatsappWebhookService } from './whatsapp-webhook.service';
import { WhatsappWebhookController } from './whatsapp-webhook.controller';
import { NotificationsModule } from '../notifications/notifications.module';
import { DatabaseModule } from '../../database/database.module';

@Global()
@Module({
  imports: [DatabaseModule, NotificationsModule],
  controllers: [WhatsappWebhookController],
  providers: [WhatsappService, WhatsappWebhookService],
  exports: [WhatsappService],
})
export class WhatsappModule {}
