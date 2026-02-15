import {
  Controller,
  Get,
  Post,
  Put,
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
  ApiQuery,
} from '@nestjs/swagger';
import { OrderStatusChangeRequestsService } from './order-status-change-requests.service';
import {
  CreateStatusChangeRequestDto,
  ApproveStatusChangeRequestDto,
  RejectStatusChangeRequestDto,
} from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('order-status-change-requests')
@ApiBearerAuth('JWT-auth')
@Controller('order-status-change-requests')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class OrderStatusChangeRequestsController {
  constructor(
    private readonly service: OrderStatusChangeRequestsService,
  ) {}

  @Post()
  @RequirePermissions('update_orders')
  @ApiOperation({ summary: 'Crear solicitud de cambio de estado' })
  @ApiResponse({
    status: 201,
    description: 'Solicitud creada correctamente',
  })
  @ApiResponse({
    status: 400,
    description:
      'Administradores no necesitan solicitar o ya existe solicitud pendiente',
  })
  async create(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateStatusChangeRequestDto,
  ) {
    return this.service.create(userId, dto);
  }

  @Get('pending')
  @RequirePermissions('approve_orders')
  @ApiOperation({
    summary: 'Listar solicitudes pendientes (solo admins)',
  })
  @ApiQuery({
    name: 'orderId',
    required: false,
    description: 'Filtrar por ID de orden',
  })
  @ApiResponse({
    status: 200,
    description: 'Solicitudes pendientes obtenidas correctamente',
  })
  async findPending(@Query('orderId') orderId?: string) {
    return this.service.findPendingRequests(orderId);
  }

  @Put(':id/approve')
  @RequirePermissions('approve_orders')
  @ApiOperation({
    summary: 'Aprobar solicitud de cambio de estado (solo admin)',
  })
  @ApiParam({ name: 'id', description: 'ID de la solicitud' })
  @ApiResponse({ status: 200, description: 'Solicitud aprobada' })
  @ApiResponse({
    status: 403,
    description: 'Solo administradores pueden aprobar',
  })
  async approve(
    @Param('id') id: string,
    @CurrentUser('id') adminId: string,
    @Body() dto: ApproveStatusChangeRequestDto,
  ) {
    return this.service.approve(id, adminId, dto);
  }

  @Put(':id/reject')
  @RequirePermissions('approve_orders')
  @ApiOperation({
    summary: 'Rechazar solicitud de cambio de estado (solo admin)',
  })
  @ApiParam({ name: 'id', description: 'ID de la solicitud' })
  @ApiResponse({ status: 200, description: 'Solicitud rechazada' })
  @ApiResponse({
    status: 403,
    description: 'Solo administradores pueden rechazar',
  })
  async reject(
    @Param('id') id: string,
    @CurrentUser('id') adminId: string,
    @Body() dto: RejectStatusChangeRequestDto,
  ) {
    return this.service.reject(id, adminId, dto);
  }

  @Get('my-requests')
  @RequirePermissions('read_orders')
  @ApiOperation({ summary: 'Obtener solicitudes del usuario actual' })
  @ApiResponse({
    status: 200,
    description: 'Solicitudes del usuario obtenidas correctamente',
  })
  async findMyRequests(@CurrentUser('id') userId: string) {
    return this.service.findByUser(userId);
  }

  @Get(':id')
  @RequirePermissions('read_orders')
  @ApiOperation({ summary: 'Obtener solicitud específica' })
  @ApiParam({ name: 'id', description: 'ID de la solicitud' })
  @ApiResponse({ status: 200, description: 'Solicitud encontrada' })
  @ApiResponse({ status: 404, description: 'Solicitud no encontrada' })
  async findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }
}
