import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { ExpenseOrdersService } from './expense-orders.service';
import {
  CreateExpenseItemDto,
  CreateExpenseOrderDto,
  FilterExpenseOrdersDto,
  UpdateExpenseOrderDto,
  UpdateExpenseOrderStatusDto,
} from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../common/interfaces/auth.interface';
import { ExpenseOrderStatus } from '../../generated/prisma';

@ApiTags('expense-orders')
@ApiBearerAuth('JWT-auth')
@Controller('expense-orders')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ExpenseOrdersController {
  constructor(private readonly service: ExpenseOrdersService) {}

  @Get()
  @RequirePermissions('read_expense_orders')
  @ApiOperation({ summary: 'Listar órdenes de gasto con filtros y paginación' })
  @ApiResponse({ status: 200, description: 'OGs obtenidas correctamente' })
  findAll(@Query() filters: FilterExpenseOrdersDto) {
    return this.service.findAll(filters);
  }

  @Get(':id')
  @RequirePermissions('read_expense_orders')
  @ApiOperation({ summary: 'Obtener detalle de una OG' })
  @ApiParam({ name: 'id', description: 'ID de la OG' })
  @ApiResponse({ status: 200, description: 'OG obtenida correctamente' })
  @ApiResponse({ status: 404, description: 'OG no encontrada' })
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @RequirePermissions('create_expense_orders')
  @ApiOperation({ summary: 'Crear una nueva Orden de Gasto' })
  @ApiResponse({ status: 201, description: 'OG creada correctamente' })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ExpenseOrderStatus,
    description: 'Estado inicial (DRAFT por defecto)',
  })
  create(
    @Body() dto: CreateExpenseOrderDto,
    @CurrentUser() user: AuthenticatedUser,
    @Query('status') status?: ExpenseOrderStatus,
  ) {
    const initialStatus =
      status === ExpenseOrderStatus.CREATED
        ? ExpenseOrderStatus.CREATED
        : ExpenseOrderStatus.DRAFT;
    return this.service.create(dto, user.id, initialStatus);
  }

  @Post(':id/items')
  @RequirePermissions('update_expense_orders')
  @ApiOperation({ summary: 'Agregar un ítem a una OG existente (solo en DRAFT o CREATED)' })
  @ApiParam({ name: 'id', description: 'ID de la OG' })
  @ApiResponse({ status: 201, description: 'Ítem agregado correctamente' })
  @ApiResponse({ status: 400, description: 'No se puede agregar ítems en el estado actual' })
  @ApiResponse({ status: 404, description: 'OG no encontrada' })
  addItem(
    @Param('id') id: string,
    @Body() dto: CreateExpenseItemDto,
  ) {
    return this.service.addItem(id, dto);
  }

  @Patch(':id')
  @RequirePermissions('update_expense_orders')
  @ApiOperation({ summary: 'Actualizar una OG (solo en DRAFT o CREATED)' })
  @ApiParam({ name: 'id', description: 'ID de la OG' })
  @ApiResponse({ status: 200, description: 'OG actualizada correctamente' })
  @ApiResponse({ status: 400, description: 'No se puede modificar en el estado actual' })
  @ApiResponse({ status: 404, description: 'OG no encontrada' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateExpenseOrderDto,
  ) {
    return this.service.update(id, dto);
  }

  @Patch(':id/status')
  @RequirePermissions('update_expense_orders')
  @ApiOperation({ summary: 'Cambiar el estado de una OG' })
  @ApiParam({ name: 'id', description: 'ID de la OG' })
  @ApiResponse({ status: 200, description: 'Estado actualizado correctamente' })
  @ApiResponse({ status: 400, description: 'Transición de estado no permitida' })
  @ApiResponse({ status: 403, description: 'Sin permisos para marcar como PAID' })
  @ApiResponse({ status: 404, description: 'OG no encontrada' })
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateExpenseOrderStatusDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.updateStatus(id, dto, user);
  }

  @Delete(':id')
  @RequirePermissions('delete_expense_orders')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Eliminar una OG (solo en DRAFT)' })
  @ApiParam({ name: 'id', description: 'ID de la OG' })
  @ApiResponse({ status: 204, description: 'OG eliminada correctamente' })
  @ApiResponse({ status: 400, description: 'Solo se puede eliminar una OG en DRAFT' })
  @ApiResponse({ status: 404, description: 'OG no encontrada' })
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
