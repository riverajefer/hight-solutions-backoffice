import {
  Controller,
  Get,
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
import { ClientOwnershipAuthRequestsService } from './client-ownership-auth-requests.service';
import {
  ApproveClientOwnershipAuthRequestDto,
  RejectClientOwnershipAuthRequestDto,
} from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('client-ownership-auth-requests')
@ApiBearerAuth('JWT-auth')
@Controller('client-ownership-auth-requests')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ClientOwnershipAuthRequestsController {
  constructor(private readonly service: ClientOwnershipAuthRequestsService) {}

  @Get('pending')
  @RequirePermissions('approve_client_ownership_auth')
  @ApiOperation({ summary: 'Listar solicitudes de autorización de propiedad de cliente pendientes' })
  @ApiResponse({ status: 200, description: 'Solicitudes pendientes' })
  async findPending() {
    return this.service.findPendingRequests();
  }

  @Get('all')
  @RequirePermissions('approve_client_ownership_auth')
  @ApiOperation({ summary: 'Listar todas las solicitudes de autorización de propiedad de cliente' })
  @ApiResponse({ status: 200, description: 'Todas las solicitudes' })
  async findAll() {
    return this.service.findAll();
  }

  @Get('my')
  @RequirePermissions('create_orders')
  @ApiOperation({ summary: 'Obtener mis solicitudes de autorización de propiedad de cliente' })
  @ApiResponse({ status: 200, description: 'Solicitudes del usuario' })
  async findMy(@CurrentUser('id') userId: string) {
    return this.service.findByUser(userId);
  }

  @Put(':id/approve')
  @RequirePermissions('approve_client_ownership_auth')
  @ApiOperation({ summary: 'Aprobar solicitud de autorización de propiedad de cliente' })
  @ApiParam({ name: 'id', description: 'ID de la solicitud' })
  @ApiResponse({ status: 200, description: 'Solicitud aprobada' })
  @ApiResponse({ status: 403, description: 'Sin permiso para aprobar' })
  async approve(
    @Param('id') id: string,
    @CurrentUser('id') reviewerId: string,
    @Body() dto: ApproveClientOwnershipAuthRequestDto,
  ) {
    return this.service.approve(id, reviewerId, dto);
  }

  @Put(':id/reject')
  @RequirePermissions('approve_client_ownership_auth')
  @ApiOperation({ summary: 'Rechazar solicitud de autorización de propiedad de cliente' })
  @ApiParam({ name: 'id', description: 'ID de la solicitud' })
  @ApiResponse({ status: 200, description: 'Solicitud rechazada' })
  @ApiResponse({ status: 403, description: 'Sin permiso para rechazar' })
  async reject(
    @Param('id') id: string,
    @CurrentUser('id') reviewerId: string,
    @Body() dto: RejectClientOwnershipAuthRequestDto,
  ) {
    return this.service.reject(id, reviewerId, dto);
  }
}
