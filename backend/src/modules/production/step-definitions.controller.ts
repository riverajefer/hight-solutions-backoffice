import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { StepDefinitionsService } from './step-definitions.service';

@ApiTags('step-definitions')
@ApiBearerAuth()
@Controller('step-definitions')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class StepDefinitionsController {
  constructor(private readonly service: StepDefinitionsService) {}

  @Get()
  @RequirePermissions('read_step_definitions')
  @ApiOperation({ summary: 'Listar todos los tipos de paso disponibles' })
  findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  @RequirePermissions('read_step_definitions')
  @ApiOperation({ summary: 'Obtener detalle de un tipo de paso' })
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }
}
