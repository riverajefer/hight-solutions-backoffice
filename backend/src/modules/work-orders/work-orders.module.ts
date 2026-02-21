import { Module } from '@nestjs/common';
import { WorkOrdersController } from './work-orders.controller';
import { WorkOrdersService } from './work-orders.service';
import { WorkOrdersRepository } from './work-orders.repository';
import { DatabaseModule } from '../../database/database.module';
import { ConsecutivesModule } from '../consecutives/consecutives.module';

@Module({
  imports: [DatabaseModule, ConsecutivesModule],
  controllers: [WorkOrdersController],
  providers: [WorkOrdersService, WorkOrdersRepository],
  exports: [WorkOrdersService],
})
export class WorkOrdersModule {}
