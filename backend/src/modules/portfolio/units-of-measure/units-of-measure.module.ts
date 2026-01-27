import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../../database/database.module';
import { UnitsOfMeasureController } from './units-of-measure.controller';
import { UnitsOfMeasureService } from './units-of-measure.service';
import { UnitsOfMeasureRepository } from './units-of-measure.repository';

@Module({
  imports: [DatabaseModule],
  controllers: [UnitsOfMeasureController],
  providers: [UnitsOfMeasureService, UnitsOfMeasureRepository],
  exports: [UnitsOfMeasureService, UnitsOfMeasureRepository],
})
export class UnitsOfMeasureModule {}
