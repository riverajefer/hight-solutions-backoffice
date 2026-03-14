import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { InventoryController } from './inventory.controller';
import { InventoryService } from './inventory.service';
import { InventoryRepository } from './inventory.repository';
import { InventoryScheduler } from './inventory.scheduler';

@Module({
  imports: [DatabaseModule, NotificationsModule],
  controllers: [InventoryController],
  providers: [InventoryService, InventoryRepository, InventoryScheduler],
  exports: [InventoryService],
})
export class InventoryModule {}
