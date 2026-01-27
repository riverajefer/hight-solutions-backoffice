import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../../database/database.module';
import { ServiceCategoriesController } from './service-categories.controller';
import { ServiceCategoriesService } from './service-categories.service';
import { ServiceCategoriesRepository } from './service-categories.repository';

@Module({
  imports: [DatabaseModule],
  controllers: [ServiceCategoriesController],
  providers: [ServiceCategoriesService, ServiceCategoriesRepository],
  exports: [ServiceCategoriesService, ServiceCategoriesRepository],
})
export class ServiceCategoriesModule {}
