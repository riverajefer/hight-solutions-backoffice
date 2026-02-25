import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { ExpenseTypesController } from './expense-types.controller';
import { ExpenseTypesService } from './expense-types.service';
import { ExpenseTypesRepository } from './expense-types.repository';

@Module({
  imports: [DatabaseModule],
  controllers: [ExpenseTypesController],
  providers: [ExpenseTypesService, ExpenseTypesRepository],
  exports: [ExpenseTypesService, ExpenseTypesRepository],
})
export class ExpenseTypesModule {}
