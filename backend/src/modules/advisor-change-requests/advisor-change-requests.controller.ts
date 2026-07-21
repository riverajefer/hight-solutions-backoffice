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
import { AdvisorChangeRequestsService } from './advisor-change-requests.service';
import {
  CreateAdvisorChangeRequestDto,
  ApproveAdvisorChangeRequestDto,
  RejectAdvisorChangeRequestDto,
} from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('advisor-change-requests')
@ApiBearerAuth('JWT-auth')
@Controller('advisor-change-requests')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AdvisorChangeRequestsController {
  constructor(private readonly service: AdvisorChangeRequestsService) {}

  @Post()
  @RequirePermissions('request_advisor_change')
  @ApiOperation({ summary: 'Crear solicitud de cambio de asesor de una OP' })
  @ApiResponse({ status: 201, description: 'Solicitud creada correctamente' })
  @ApiResponse({
    status: 400,
    description:
      'Administradores no necesitan solicitar, asesor inválido o ya existe solicitud pendiente',
  })
  async create(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateAdvisorChangeRequestDto,
  ) {
    return this.service.create(userId, dto);
  }

  @Get('pending')
  @RequirePermissions('approve_advisor_change')
  @ApiOperation({ summary: 'Listar solicitudes pendientes (solo admins)' })
  @ApiQuery({ name: 'orderId', required: false })
  @ApiResponse({ status: 200, description: 'Solicitudes pendientes' })
  async findPending(@Query('orderId') orderId?: string) {
    return this.service.findPendingRequests(orderId);
  }

  @Get('all')
  @RequirePermissions('approve_advisor_change')
  @ApiOperation({ summary: 'Listar todas las solicitudes (solo admins)' })
  @ApiQuery({ name: 'orderId', required: false })
  @ApiResponse({ status: 200, description: 'Todas las solicitudes' })
  async findAll(@Query('orderId') orderId?: string) {
    return this.service.findAllRequests(orderId);
  }

  @Get('my-requests')
  @RequirePermissions('request_advisor_change')
  @ApiOperation({ summary: 'Obtener solicitudes del usuario actual' })
  @ApiResponse({ status: 200, description: 'Solicitudes del usuario' })
  async findMyRequests(@CurrentUser('id') userId: string) {
    return this.service.findByUser(userId);
  }

  @Get('order/:orderId')
  @RequirePermissions('request_advisor_change')
  @ApiOperation({
    summary: 'Obtener la solicitud pendiente de cambio de asesor de una OP',
  })
  @ApiParam({ name: 'orderId', description: 'ID de la orden' })
  @ApiResponse({ status: 200, description: 'Solicitud pendiente o null' })
  async findPendingByOrder(@Param('orderId') orderId: string) {
    return this.service.findPendingByOrder(orderId);
  }

  @Put(':id/approve')
  @RequirePermissions('approve_advisor_change')
  @ApiOperation({ summary: 'Aprobar solicitud de cambio de asesor (solo admin)' })
  @ApiParam({ name: 'id', description: 'ID de la solicitud' })
  @ApiResponse({ status: 200, description: 'Solicitud aprobada y asesor reasignado' })
  @ApiResponse({ status: 403, description: 'Solo administradores pueden aprobar' })
  async approve(
    @Param('id') id: string,
    @CurrentUser('id') adminId: string,
    @Body() dto: ApproveAdvisorChangeRequestDto,
  ) {
    return this.service.approve(id, adminId, dto);
  }

  @Put(':id/reject')
  @RequirePermissions('approve_advisor_change')
  @ApiOperation({ summary: 'Rechazar solicitud de cambio de asesor (solo admin)' })
  @ApiParam({ name: 'id', description: 'ID de la solicitud' })
  @ApiResponse({ status: 200, description: 'Solicitud rechazada' })
  @ApiResponse({ status: 403, description: 'Solo administradores pueden rechazar' })
  async reject(
    @Param('id') id: string,
    @CurrentUser('id') adminId: string,
    @Body() dto: RejectAdvisorChangeRequestDto,
  ) {
    return this.service.reject(id, adminId, dto);
  }

  @Get(':id')
  @RequirePermissions('request_advisor_change')
  @ApiOperation({ summary: 'Obtener solicitud específica' })
  @ApiParam({ name: 'id', description: 'ID de la solicitud' })
  @ApiResponse({ status: 200, description: 'Solicitud encontrada' })
  @ApiResponse({ status: 404, description: 'Solicitud no encontrada' })
  async findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }
}
