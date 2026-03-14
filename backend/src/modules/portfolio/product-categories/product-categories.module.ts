import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../../database/database.module';
import { ProductCategoriesController } from './product-categories.controller';
import { ProductCategoriesService } from './product-categories.service';
import { ProductCategoriesRepository } from './product-categories.repository';

@Module({
  imports: [DatabaseModule],
  controllers: [ProductCategoriesController],
  providers: [ProductCategoriesService, ProductCategoriesRepository],
  exports: [ProductCategoriesService, ProductCategoriesRepository],
})
export class ProductCategoriesModule {}
