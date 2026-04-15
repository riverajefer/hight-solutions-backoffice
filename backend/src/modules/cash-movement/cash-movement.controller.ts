import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CashMovementService } from './cash-movement.service';
import {
  CreateCashMovementDto,
  FilterCashMovementsDto,
  VoidCashMovementDto,
} from './dto';

@ApiTags('cash-movements')
@ApiBearerAuth()
@Controller('cash-movements')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class CashMovementController {
  constructor(private readonly service: CashMovementService) {}

  @Get()
  @RequirePermissions('read_cash_movements')
  @ApiOperation({ summary: 'Listar movimientos de caja con filtros' })
  findAll(@Query() filters: FilterCashMovementsDto) {
    return this.service.findAll(filters);
  }

  @Get(':id')
  @RequirePermissions('read_cash_movements')
  @ApiOperation({ summary: 'Obtener un movimiento de caja por ID' })
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @RequirePermissions('create_cash_movements')
  @ApiOperation({ summary: 'Registrar un movimiento de caja' })
  @ApiResponse({ status: 201, description: 'Movimiento registrado correctamente' })
  create(
    @Body() dto: CreateCashMovementDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.service.createMovement(dto, userId);
  }

  @Post(':id/void')
  @RequirePermissions('void_cash_movements')
  @ApiOperation({ summary: 'Anular un movimiento de caja (crea contra-movimiento)' })
  @ApiResponse({ status: 200, description: 'Movimiento anulado y contra-movimiento creado' })
  void(
    @Param('id') id: string,
    @Body() dto: VoidCashMovementDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.service.voidMovement(id, dto, userId);
  }
}
