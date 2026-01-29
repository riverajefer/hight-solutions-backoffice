import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { OrdersRepository } from './orders.repository';
import { ConsecutiveRepository } from './consecutive.repository';

@Module({
  imports: [DatabaseModule],
  controllers: [OrdersController],
  providers: [OrdersService, OrdersRepository, ConsecutiveRepository],
  exports: [OrdersService, OrdersRepository],
})
export class OrdersModule {}
