import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { ConsecutivesModule } from '../consecutives/consecutives.module';
import { OrderEditRequestsModule } from '../order-edit-requests/order-edit-requests.module';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { OrdersRepository } from './orders.repository';
import { CanEditOrderGuard } from '../../common/guards/can-edit-order.guard';

@Module({
  imports: [DatabaseModule, ConsecutivesModule, OrderEditRequestsModule],
  controllers: [OrdersController],
  providers: [OrdersService, OrdersRepository, CanEditOrderGuard],
  exports: [OrdersService, OrdersRepository],
})
export class OrdersModule {}
