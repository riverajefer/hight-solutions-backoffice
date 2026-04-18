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
import { CashMovementVoidRequestsService } from './cash-movement-void-requests.service';
import { ReviewVoidRequestDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('cash-movement-void-requests')
@ApiBearerAuth('JWT-auth')
@Controller('cash-movement-void-requests')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class CashMovementVoidRequestsGlobalController {
  constructor(
    private readonly service: CashMovementVoidRequestsService,
  ) {}

  @Get('pending')
  @RequirePermissions('approve_cash_movements')
  @ApiOperation({ summary: 'Listar solicitudes de anulación pendientes (solo admins)' })
  @ApiResponse({ status: 200, description: 'Solicitudes pendientes obtenidas correctamente' })
  async findAllPending() {
    return this.service.findAllPending();
  }

  @Get('all')
  @RequirePermissions('approve_cash_movements')
  @ApiOperation({ summary: 'Listar todas las solicitudes de anulación (historial)' })
  @ApiResponse({ status: 200, description: 'Todas las solicitudes obtenidas correctamente' })
  async findAll() {
    return this.service.findAll();
  }

  @Put(':requestId/approve')
  @RequirePermissions('approve_cash_movements')
  @ApiOperation({ summary: 'Aprobar solicitud de anulación de movimiento (solo admin)' })
  @ApiParam({ name: 'requestId', description: 'ID de la solicitud' })
  @ApiResponse({ status: 200, description: 'Solicitud aprobada y movimiento anulado' })
  async approve(
    @Param('requestId') requestId: string,
    @CurrentUser('id') adminId: string,
    @Body() dto: ReviewVoidRequestDto,
  ) {
    return this.service.approve(requestId, adminId, dto);
  }

  @Put(':requestId/reject')
  @RequirePermissions('approve_cash_movements')
  @ApiOperation({ summary: 'Rechazar solicitud de anulación de movimiento (solo admin)' })
  @ApiParam({ name: 'requestId', description: 'ID de la solicitud' })
  @ApiResponse({ status: 200, description: 'Solicitud rechazada' })
  async reject(
    @Param('requestId') requestId: string,
    @CurrentUser('id') adminId: string,
    @Body() dto: ReviewVoidRequestDto,
  ) {
    return this.service.reject(requestId, adminId, dto);
  }
}
