import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { UsersRepository } from './users.repository';
import { RolesModule } from '../roles/roles.module';
import { CargosModule } from '../cargos/cargos.module';

@Module({
  imports: [RolesModule, CargosModule],
  controllers: [UsersController],
  providers: [UsersService, UsersRepository],
  exports: [UsersService],
})
export class UsersModule {}
