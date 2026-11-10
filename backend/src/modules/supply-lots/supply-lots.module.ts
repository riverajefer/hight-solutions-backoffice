import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { SupplyLotsController } from './supply-lots.controller';
import { SupplyLotsService } from './supply-lots.service';
import { SupplyLotsRepository } from './supply-lots.repository';

@Module({
  imports: [DatabaseModule],
  controllers: [SupplyLotsController],
  providers: [SupplyLotsService, SupplyLotsRepository],
  exports: [SupplyLotsService],
})
export class SupplyLotsModule {}
