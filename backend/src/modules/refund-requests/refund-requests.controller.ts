import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { RefundRequestsService } from './refund-requests.service';
import {
  ApproveRefundRequestDto,
  CreateRefundRequestDto,
  RejectRefundRequestDto,
} from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('refund-requests')
@ApiBearerAuth('JWT-auth')
@Controller('refund-requests')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class RefundRequestsController {
  constructor(private readonly service: RefundRequestsService) {}

  @Post()
  @RequirePermissions('create_refund_requests')
  @ApiOperation({ summary: 'Solicitar devolución de dinero al cliente' })
  @ApiResponse({ status: 201, description: 'Solicitud creada' })
  @ApiResponse({ status: 400, description: 'Datos inválidos o sin saldo a favor' })
  @ApiResponse({ status: 409, description: 'Ya existe una solicitud pendiente para esta orden' })
  async create(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateRefundRequestDto,
  ) {
    return this.service.create(userId, dto);
  }

  @Get('pending')
  @RequirePermissions('approve_refunds')
  @ApiOperation({ summary: 'Listar solicitudes de devolución pendientes' })
  async findPending() {
    return this.service.findPendingRequests();
  }

  @Get('all')
  @RequirePermissions('approve_refunds')
  @ApiOperation({ summary: 'Listar todas las solicitudes de devolución' })
  async findAll() {
    return this.service.findAll();
  }

  @Get('my')
  @RequirePermissions('create_refund_requests')
  @ApiOperation({ summary: 'Listar solicitudes propias' })
  async findMy(@CurrentUser('id') userId: string) {
    return this.service.findByUser(userId);
  }

  @Get('by-order/:orderId')
  @RequirePermissions('read_orders')
  @ApiOperation({ summary: 'Listar solicitudes de devolución de una orden' })
  @ApiParam({ name: 'orderId' })
  async findByOrder(@Param('orderId') orderId: string) {
    return this.service.findByOrder(orderId);
  }

  @Get(':id')
  @RequirePermissions('read_orders')
  @ApiOperation({ summary: 'Obtener solicitud por id' })
  @ApiParam({ name: 'id' })
  async findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Put(':id/approve')
  @RequirePermissions('approve_refunds')
  @ApiOperation({ summary: 'Aprobar devolución' })
  @ApiParam({ name: 'id' })
  @ApiResponse({ status: 200, description: 'Devolución aprobada, CashMovement creado' })
  @ApiResponse({ status: 400, description: 'Sin sesión de caja abierta o saldo insuficiente' })
  async approve(
    @Param('id') id: string,
    @CurrentUser('id') reviewerId: string,
    @Body() dto: ApproveRefundRequestDto,
  ) {
    return this.service.approve(id, reviewerId, dto);
  }

  @Put(':id/reject')
  @RequirePermissions('approve_refunds')
  @ApiOperation({ summary: 'Rechazar devolución' })
  @ApiParam({ name: 'id' })
  async reject(
    @Param('id') id: string,
    @CurrentUser('id') reviewerId: string,
    @Body() dto: RejectRefundRequestDto,
  ) {
    return this.service.reject(id, reviewerId, dto);
  }
}
