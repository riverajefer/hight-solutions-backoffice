import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { ProductionBoardController } from './production-board.controller';
import { ProductionBoardRepository } from './production-board.repository';
import { ProductionBoardService } from './production-board.service';

@Module({
  imports: [DatabaseModule],
  controllers: [ProductionBoardController],
  providers: [ProductionBoardService, ProductionBoardRepository],
})
export class ProductionBoardModule {}
