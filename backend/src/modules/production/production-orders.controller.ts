import { Controller, Get, Post, Patch, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ProductionOrdersService } from './production-orders.service';
import {
  CreateProductionOrderDto,
  FilterProductionOrdersDto,
  UpdateStepSpecificationDto,
  UpdateStepExecutionDto,
} from './dto';

@ApiTags('production-orders')
@ApiBearerAuth()
@Controller('production-orders')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ProductionOrdersController {
  constructor(private readonly service: ProductionOrdersService) {}

  @Get()
  @RequirePermissions('read_production_orders')
  @ApiOperation({ summary: 'Listar órdenes de producción' })
  findAll(@Query() filters: FilterProductionOrdersDto) {
    return this.service.findAll(filters);
  }

  @Get(':id')
  @RequirePermissions('read_production_orders')
  @ApiOperation({ summary: 'Obtener detalle completo de una OT de producción' })
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Get(':id/progress')
  @RequirePermissions('read_production_orders')
  @ApiOperation({ summary: 'Obtener resumen de progreso de la OT' })
  getProgress(@Param('id') id: string) {
    return this.service.getProgress(id);
  }

  @Post()
  @RequirePermissions('create_production_orders')
  @ApiOperation({ summary: 'Crear OT de producción desde una plantilla (vinculada a WorkOrder)' })
  create(
    @Body() dto: CreateProductionOrderDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.service.create(dto, userId);
  }

  @Patch(':orderId/steps/:stepId/specification')
  @RequirePermissions('update_production_orders')
  @ApiOperation({ summary: 'Llenar campos de especificación de un paso (coordinador)' })
  updateSpecification(
    @Param('orderId') orderId: string,
    @Param('stepId') stepId: string,
    @Body() dto: UpdateStepSpecificationDto,
  ) {
    return this.service.updateSpecification(orderId, stepId, dto.data);
  }

  @Patch(':orderId/steps/:stepId/execution')
  @RequirePermissions('update_production_orders')
  @ApiOperation({ summary: 'Llenar campos de ejecución de un paso (operario)' })
  updateExecution(
    @Param('orderId') orderId: string,
    @Param('stepId') stepId: string,
    @Body() dto: UpdateStepExecutionDto,
  ) {
    return this.service.updateExecution(orderId, stepId, dto.data);
  }

  @Patch(':orderId/steps/:stepId/complete')
  @RequirePermissions('update_production_orders')
  @ApiOperation({ summary: 'Marcar un paso como completado (valida campos requeridos)' })
  completeStep(
    @Param('orderId') orderId: string,
    @Param('stepId') stepId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.service.completeStep(orderId, stepId, userId);
  }
}
