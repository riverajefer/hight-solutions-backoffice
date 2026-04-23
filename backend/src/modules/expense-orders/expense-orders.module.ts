import { Module, forwardRef } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { ConsecutivesModule } from '../consecutives/consecutives.module';
import { ExpenseOrderAuthRequestsModule } from '../expense-order-auth-requests/expense-order-auth-requests.module';
import { AccountsPayableModule } from '../accounts-payable/accounts-payable.module';
import { ExpenseOrdersController } from './expense-orders.controller';
import { ExpenseOrdersService } from './expense-orders.service';
import { ExpenseOrdersRepository } from './expense-orders.repository';

@Module({
  imports: [
    DatabaseModule,
    ConsecutivesModule,
    forwardRef(() => ExpenseOrderAuthRequestsModule),
    AccountsPayableModule,
  ],
  controllers: [ExpenseOrdersController],
  providers: [ExpenseOrdersService, ExpenseOrdersRepository],
  exports: [ExpenseOrdersService, ExpenseOrdersRepository],
})
export class ExpenseOrdersModule {}
