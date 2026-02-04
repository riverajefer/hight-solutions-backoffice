import { Module } from '@nestjs/common';
import { CommercialChannelsController } from './commercial-channels.controller';
import { CommercialChannelsService } from './commercial-channels.service';
import { DatabaseModule } from '../../database/database.module';

import { CommercialChannelsRepository } from './commercial-channels.repository';

@Module({
  imports: [DatabaseModule],
  controllers: [CommercialChannelsController],
  providers: [CommercialChannelsService, CommercialChannelsRepository],
  exports: [CommercialChannelsService, CommercialChannelsRepository],
})
export class CommercialChannelsModule {}
