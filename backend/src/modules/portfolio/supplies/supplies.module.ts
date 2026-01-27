import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../../database/database.module';
import { SuppliesController } from './supplies.controller';
import { SuppliesService } from './supplies.service';
import { SuppliesRepository } from './supplies.repository';

@Module({
  imports: [DatabaseModule],
  controllers: [SuppliesController],
  providers: [SuppliesService, SuppliesRepository],
  exports: [SuppliesService, SuppliesRepository],
})
export class SuppliesModule {}
