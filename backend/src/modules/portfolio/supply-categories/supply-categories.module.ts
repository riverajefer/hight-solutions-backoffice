import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../../database/database.module';
import { SupplyCategoriesController } from './supply-categories.controller';
import { SupplyCategoriesService } from './supply-categories.service';
import { SupplyCategoriesRepository } from './supply-categories.repository';

@Module({
  imports: [DatabaseModule],
  controllers: [SupplyCategoriesController],
  providers: [SupplyCategoriesService, SupplyCategoriesRepository],
  exports: [SupplyCategoriesService, SupplyCategoriesRepository],
})
export class SupplyCategoriesModule {}
