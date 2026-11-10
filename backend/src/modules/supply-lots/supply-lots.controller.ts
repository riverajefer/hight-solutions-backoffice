import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../common/interfaces/auth.interface';
import { CreateSupplyLotDto, FilterSupplyLotsDto, VoidSupplyLotDto } from './dto';
import { SupplyLotsService } from './supply-lots.service';

@ApiTags('supply-lots')
@ApiBearerAuth('JWT-auth')
@Controller('supply-lots')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class SupplyLotsController {
  constructor(private readonly service: SupplyLotsService) {}

  @Get()
  @RequirePermissions('read_supply_lots')
  @ApiOperation({ summary: 'Listar lotes (rollos) con saldo, estado y costos' })
  @ApiResponse({ status: 200, description: 'Lotes obtenidos correctamente' })
  findAll(@Query() filters: FilterSupplyLotsDto) {
    return this.service.findAll(filters);
  }

  @Get('summary')
  @RequirePermissions('read_supply_lots')
  @ApiOperation({ summary: 'Resumen por insumo controlado por lotes' })
  @ApiResponse({ status: 200, description: 'Resumen obtenido correctamente' })
  getSummary() {
    return this.service.getSummary();
  }

  @Get(':id')
  @RequirePermissions('read_supply_lots')
  @ApiOperation({ summary: 'Detalle de un lote con su kardex' })
  @ApiParam({ name: 'id', description: 'ID del lote' })
  @ApiResponse({ status: 404, description: 'Lote no encontrado' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @RequirePermissions('create_supply_lots')
  @ApiOperation({ summary: 'Registrar el ingreso de un lote (rollo)' })
  @ApiResponse({ status: 201, description: 'Lote registrado' })
  @ApiResponse({ status: 400, description: 'Insumo sin control por lotes o costos inválidos' })
  create(@Body() dto: CreateSupplyLotDto, @CurrentUser() user: AuthenticatedUser) {
    return this.service.create(dto, user.id);
  }

  @Post(':id/void')
  @RequirePermissions('manage_supply_lots')
  @ApiOperation({ summary: 'Anular un lote mal registrado (solo si no tiene consumos)' })
  @ApiParam({ name: 'id', description: 'ID del lote' })
  @ApiResponse({ status: 400, description: 'El lote ya tiene consumos o no está vigente' })
  void(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: VoidSupplyLotDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.void(id, dto, user.id);
  }
}
