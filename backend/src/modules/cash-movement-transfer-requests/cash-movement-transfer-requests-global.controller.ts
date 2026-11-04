import { Body, Controller, Get, Param, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CashMovementTransferRequestsService } from './cash-movement-transfer-requests.service';
import { ReviewTransferRequestDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('cash-movement-transfer-requests')
@ApiBearerAuth('JWT-auth')
@Controller('cash-movement-transfer-requests')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class CashMovementTransferRequestsGlobalController {
  constructor(private readonly service: CashMovementTransferRequestsService) {}

  @Get('pending')
  @RequirePermissions('approve_cash_movement_transfer')
  @ApiOperation({ summary: 'Listar traslados pendientes, con su efecto en el cierre' })
  @ApiResponse({ status: 200, description: 'Solicitudes pendientes' })
  async findAllPending() {
    return this.service.findAllPending();
  }

  @Get('all')
  @RequirePermissions('approve_cash_movement_transfer')
  @ApiOperation({ summary: 'Historial de traslados (últimos 200)' })
  @ApiResponse({ status: 200, description: 'Historial de solicitudes' })
  async findAll() {
    return this.service.findAll();
  }

  @Get('session/:sessionId')
  @RequirePermissions('read_cash_sessions')
  @ApiOperation({ summary: 'Traslados que salieron de una sesión o entraron a ella' })
  @ApiParam({ name: 'sessionId', description: 'ID de la sesión de caja' })
  async findBySession(@Param('sessionId') sessionId: string) {
    return this.service.findBySession(sessionId);
  }

  @Get('expense-order/:expenseOrderId')
  @RequirePermissions('request_cash_movement_transfer')
  @ApiOperation({ summary: 'Egresos en efectivo de una OG y si se pueden trasladar' })
  @ApiParam({ name: 'expenseOrderId', description: 'ID de la OG' })
  async findExpenseOrderMovements(@Param('expenseOrderId') expenseOrderId: string) {
    return this.service.findExpenseOrderMovements(expenseOrderId);
  }

  @Put(':requestId/approve')
  @RequirePermissions('approve_cash_movement_transfer')
  @ApiOperation({ summary: 'Aprobar y aplicar el traslado (solo admin)' })
  @ApiParam({ name: 'requestId', description: 'ID de la solicitud' })
  @ApiResponse({ status: 200, description: 'Traslado aplicado' })
  async approve(
    @Param('requestId') requestId: string,
    @CurrentUser('id') reviewerId: string,
    @Body() dto: ReviewTransferRequestDto,
  ) {
    return this.service.approve(requestId, reviewerId, dto);
  }

  @Put(':requestId/reject')
  @RequirePermissions('approve_cash_movement_transfer')
  @ApiOperation({ summary: 'Rechazar el traslado (solo admin)' })
  @ApiParam({ name: 'requestId', description: 'ID de la solicitud' })
  @ApiResponse({ status: 200, description: 'Traslado rechazado' })
  async reject(
    @Param('requestId') requestId: string,
    @CurrentUser('id') reviewerId: string,
    @Body() dto: ReviewTransferRequestDto,
  ) {
    return this.service.reject(requestId, reviewerId, dto);
  }
}
