import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { ConsecutivesModule } from '../consecutives/consecutives.module';
import { ProductionRepository } from './production.repository';
import { StepDefinitionsService } from './step-definitions.service';
import { ProductTemplatesService } from './product-templates.service';
import { ProductionOrdersService } from './production-orders.service';
import { StepDefinitionsController } from './step-definitions.controller';
import { ProductTemplatesController } from './product-templates.controller';
import { ProductionOrdersController } from './production-orders.controller';

@Module({
  imports: [DatabaseModule, ConsecutivesModule],
  controllers: [
    StepDefinitionsController,
    ProductTemplatesController,
    ProductionOrdersController,
  ],
  providers: [
    ProductionRepository,
    StepDefinitionsService,
    ProductTemplatesService,
    ProductionOrdersService,
  ],
  exports: [ProductionRepository, ProductionOrdersService],
})
export class ProductionModule {}
