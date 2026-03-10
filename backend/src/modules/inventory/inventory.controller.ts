import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { InventoryService } from './inventory.service';
import { CreateInventoryMovementDto, FilterInventoryMovementsDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../common/interfaces/auth.interface';

@ApiTags('inventory')
@ApiBearerAuth('JWT-auth')
@Controller('inventory')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class InventoryController {
  constructor(private readonly service: InventoryService) {}

  @Get('movements')
  @RequirePermissions('read_inventory_movements')
  @ApiOperation({ summary: 'Listar movimientos de inventario con filtros y paginación' })
  @ApiResponse({ status: 200, description: 'Movimientos obtenidos correctamente' })
  findAll(@Query() filters: FilterInventoryMovementsDto) {
    return this.service.findAll(filters);
  }

  @Get('low-stock')
  @RequirePermissions('read_inventory_movements')
  @ApiOperation({ summary: 'Obtener insumos con stock por debajo del mínimo' })
  @ApiResponse({ status: 200, description: 'Insumos con stock bajo obtenidos correctamente' })
  getLowStock() {
    return this.service.getLowStockSupplies();
  }

  @Get('valuation')
  @RequirePermissions('read_inventory_movements')
  @ApiOperation({ summary: 'Obtener valoración del inventario actual' })
  @ApiResponse({ status: 200, description: 'Valoración obtenida correctamente' })
  getValuation() {
    return this.service.getInventoryValuation();
  }

  @Get('movements/:id')
  @RequirePermissions('read_inventory_movements')
  @ApiOperation({ summary: 'Obtener detalle de un movimiento de inventario' })
  @ApiParam({ name: 'id', description: 'ID del movimiento' })
  @ApiResponse({ status: 200, description: 'Movimiento obtenido correctamente' })
  @ApiResponse({ status: 404, description: 'Movimiento no encontrado' })
  findOne(@Param('id') id: string) {
    return this.service.findById(id);
  }

  @Post('movements')
  @RequirePermissions('create_inventory_movements')
  @ApiOperation({
    summary: 'Registrar un movimiento de inventario manual (ENTRY, ADJUSTMENT, RETURN, INITIAL)',
  })
  @ApiResponse({ status: 201, description: 'Movimiento registrado correctamente' })
  @ApiResponse({ status: 400, description: 'Datos inválidos o stock insuficiente' })
  @ApiResponse({ status: 404, description: 'Insumo no encontrado' })
  create(
    @Body() dto: CreateInventoryMovementDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    return this.service.createManualMovement(dto, currentUser.id);
  }
}
