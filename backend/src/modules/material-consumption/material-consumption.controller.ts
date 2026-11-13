import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../common/interfaces/auth.interface';
import { AssignPendingDto, CorrectConsumptionDto } from './dto';
import { MaterialConsumptionService } from './material-consumption.service';

@ApiTags('material-consumption')
@ApiBearerAuth('JWT-auth')
@Controller('material-consumption')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class MaterialConsumptionController {
  constructor(private readonly service: MaterialConsumptionService) {}

  @Get('orders/:orderId')
  @RequirePermissions('read_supply_lots')
  @ApiOperation({ summary: 'Material consumido por cada ítem de la OP' })
  @ApiParam({ name: 'orderId', description: 'ID de la OP' })
  getOrder(@Param('orderId', ParseUUIDPipe) orderId: string) {
    return this.service.getOrderConsumption(orderId);
  }

  @Post('orders/:orderId/sync')
  @RequirePermissions('manage_material_consumption')
  @ApiOperation({ summary: 'Recalcular el consumo de la OP (idempotente)' })
  async syncOrder(
    @Param('orderId', ParseUUIDPipe) orderId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.service.syncOrder(orderId, user.id);
    return this.service.getOrderConsumption(orderId);
  }

  @Put('order-items/:orderItemId')
  @RequirePermissions('manage_material_consumption')
  @ApiOperation({ summary: 'Corregir a mano el material usado por un ítem (null = automático)' })
  @ApiParam({ name: 'orderItemId', description: 'ID del ítem de la OP' })
  correctItem(
    @Param('orderItemId', ParseUUIDPipe) orderItemId: string,
    @Body() dto: CorrectConsumptionDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.correctItem(orderItemId, dto.supplyId, dto.quantity, user.id);
  }

  @Get('pending')
  @RequirePermissions('read_supply_lots')
  @ApiOperation({ summary: 'Consumos sin rollo asignado (vendidos sin stock registrado)' })
  getPending() {
    return this.service.getPending();
  }

  @Post('pending/assign')
  @RequirePermissions('manage_supply_lots')
  @ApiOperation({ summary: 'Asignar a rollos los consumos pendientes de un insumo' })
  assignPending(@Body() dto: AssignPendingDto, @CurrentUser() user: AuthenticatedUser) {
    return this.service.assignPending(dto.supplyId, user.id);
  }

  @Get('lots/:lotId')
  @RequirePermissions('read_supply_lots')
  @ApiOperation({ summary: 'OP que consumieron de un rollo' })
  getLot(@Param('lotId', ParseUUIDPipe) lotId: string) {
    return this.service.getLotConsumption(lotId);
  }
}
