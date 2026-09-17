import { Module } from '@nestjs/common';
import { RolesService } from './roles.service';
import { RolesController } from './roles.controller';
import { RolesRepository } from './roles.repository';
import { RolePrivilegeService } from './role-privilege.service';
import { PermissionsModule } from '../permissions/permissions.module';

@Module({
  imports: [PermissionsModule],
  controllers: [RolesController],
  providers: [RolesService, RolesRepository, RolePrivilegeService],
  exports: [RolesService, RolesRepository, RolePrivilegeService],
})
export class RolesModule {}
