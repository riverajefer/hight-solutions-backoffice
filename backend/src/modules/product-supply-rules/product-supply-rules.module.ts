import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { ProductSupplyRulesController } from './product-supply-rules.controller';
import { ProductSupplyRulesRepository } from './product-supply-rules.repository';
import { ProductSupplyRulesService } from './product-supply-rules.service';

@Module({
  imports: [DatabaseModule],
  controllers: [ProductSupplyRulesController],
  providers: [ProductSupplyRulesService, ProductSupplyRulesRepository],
})
export class ProductSupplyRulesModule {}
