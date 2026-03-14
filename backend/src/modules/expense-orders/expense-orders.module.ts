import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { ConsecutivesModule } from '../consecutives/consecutives.module';
import { ExpenseOrderAuthRequestsModule } from '../expense-order-auth-requests/expense-order-auth-requests.module';
import { ExpenseOrdersController } from './expense-orders.controller';
import { ExpenseOrdersService } from './expense-orders.service';
import { ExpenseOrdersRepository } from './expense-orders.repository';

@Module({
  imports: [DatabaseModule, ConsecutivesModule, ExpenseOrderAuthRequestsModule],
  controllers: [ExpenseOrdersController],
  providers: [ExpenseOrdersService, ExpenseOrdersRepository],
  exports: [ExpenseOrdersService, ExpenseOrdersRepository],
})
export class ExpenseOrdersModule {}
