import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { SupplyLotsModule } from '../supply-lots/supply-lots.module';
import { MaterialConsumptionController } from './material-consumption.controller';
import { MaterialConsumptionService } from './material-consumption.service';

@Module({
  imports: [DatabaseModule, NotificationsModule, SupplyLotsModule],
  controllers: [MaterialConsumptionController],
  providers: [MaterialConsumptionService],
  exports: [MaterialConsumptionService],
})
export class MaterialConsumptionModule {}
