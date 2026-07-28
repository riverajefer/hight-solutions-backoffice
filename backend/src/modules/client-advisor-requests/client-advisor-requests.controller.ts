import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { ClientAdvisorRequestsService } from './client-advisor-requests.service';
import {
  CreateClientAdvisorRequestDto,
  ApproveClientAdvisorRequestDto,
  RejectClientAdvisorRequestDto,
} from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('client-advisor-requests')
@ApiBearerAuth('JWT-auth')
@Controller('client-advisor-requests')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ClientAdvisorRequestsController {
  constructor(private readonly service: ClientAdvisorRequestsService) {}

  @Post()
  @RequirePermissions('request_client_advisor')
  @ApiOperation({ summary: 'Solicitar asignación de un asesor a un cliente' })
  @ApiResponse({ status: 201, description: 'Solicitud creada correctamente' })
  @ApiResponse({
    status: 400,
    description:
      'Asesor inválido, ya asignado o solicitud pendiente ya existente',
  })
  async create(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateClientAdvisorRequestDto,
  ) {
    return this.service.create(userId, dto);
  }

  @Get('pending')
  @RequirePermissions('approve_client_advisor')
  @ApiOperation({ summary: 'Listar solicitudes pendientes (revisores)' })
  @ApiResponse({ status: 200, description: 'Solicitudes pendientes' })
  async findPending() {
    return this.service.findPendingRequests();
  }

  @Get('all')
  @RequirePermissions('approve_client_advisor')
  @ApiOperation({ summary: 'Listar todas las solicitudes (revisores)' })
  @ApiResponse({ status: 200, description: 'Todas las solicitudes' })
  async findAll() {
    return this.service.findAllRequests();
  }

  @Get('my-requests')
  @RequirePermissions('request_client_advisor')
  @ApiOperation({ summary: 'Obtener solicitudes del usuario actual' })
  @ApiResponse({ status: 200, description: 'Solicitudes del usuario' })
  async findMyRequests(@CurrentUser('id') userId: string) {
    return this.service.findByUser(userId);
  }

  @Get('client/:clientId')
  @RequirePermissions('request_client_advisor')
  @ApiOperation({ summary: 'Obtener las solicitudes de un cliente' })
  @ApiParam({ name: 'clientId', description: 'ID del cliente' })
  @ApiResponse({ status: 200, description: 'Solicitudes del cliente' })
  async findByClient(@Param('clientId') clientId: string) {
    return this.service.findByClient(clientId);
  }

  @Put(':id/approve')
  @RequirePermissions('approve_client_advisor')
  @ApiOperation({ summary: 'Aprobar solicitud de asignación de asesor' })
  @ApiParam({ name: 'id', description: 'ID de la solicitud' })
  @ApiResponse({
    status: 200,
    description: 'Solicitud aprobada y asesor asignado',
  })
  @ApiResponse({ status: 403, description: 'Sin permiso para aprobar' })
  async approve(
    @Param('id') id: string,
    @CurrentUser('id') reviewerId: string,
    @Body() dto: ApproveClientAdvisorRequestDto,
  ) {
    return this.service.approve(id, reviewerId, dto);
  }

  @Put(':id/reject')
  @RequirePermissions('approve_client_advisor')
  @ApiOperation({ summary: 'Rechazar solicitud de asignación de asesor' })
  @ApiParam({ name: 'id', description: 'ID de la solicitud' })
  @ApiResponse({ status: 200, description: 'Solicitud rechazada' })
  @ApiResponse({ status: 403, description: 'Sin permiso para rechazar' })
  async reject(
    @Param('id') id: string,
    @CurrentUser('id') reviewerId: string,
    @Body() dto: RejectClientAdvisorRequestDto,
  ) {
    return this.service.reject(id, reviewerId, dto);
  }
}
