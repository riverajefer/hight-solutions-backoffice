import { Module } from '@nestjs/common';
import { CommercialChannelsController } from './commercial-channels.controller';
import { CommercialChannelsService } from './commercial-channels.service';
import { DatabaseModule } from '../../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [CommercialChannelsController],
  providers: [CommercialChannelsService],
  exports: [CommercialChannelsService],
})
export class CommercialChannelsModule {}
