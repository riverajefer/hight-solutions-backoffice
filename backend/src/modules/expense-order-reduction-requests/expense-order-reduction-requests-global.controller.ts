import { Body, Controller, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { ExpenseOrderReductionRequestsService } from './expense-order-reduction-requests.service';
import { RegisterReductionRefundDto, ReviewExpenseOrderReductionDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('expense-order-reduction-requests')
@ApiBearerAuth('JWT-auth')
@Controller('expense-order-reduction-requests')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ExpenseOrderReductionRequestsGlobalController {
  constructor(private readonly service: ExpenseOrderReductionRequestsService) {}

  @Get('pending')
  @RequirePermissions('read_expense_orders')
  @ApiOperation({ summary: 'Solicitudes pendientes, con su plan (solo admin)' })
  async findAllPending(@CurrentUser('id') userId: string) {
    return this.service.findAllPending(userId);
  }

  @Get('all')
  @RequirePermissions('read_expense_orders')
  @ApiOperation({ summary: 'Historial, últimas 200 (solo admin)' })
  async findAll(@CurrentUser('id') userId: string) {
    return this.service.findAll(userId);
  }

  @Get('pending-refunds')
  @RequirePermissions('caja_authorize_expense_orders')
  @ApiOperation({
    summary: 'Reintegros que el proveedor debe devolver y Caja no ha recibido',
  })
  async findPendingRefunds() {
    return this.service.findPendingRefunds();
  }

  @Put(':requestId/approve')
  @RequirePermissions('read_expense_orders')
  @ApiOperation({
    summary: 'Aprobar y aplicar (admin distinto de quien la pidió)',
  })
  @ApiParam({ name: 'requestId', description: 'ID de la solicitud' })
  async approve(
    @Param('requestId') requestId: string,
    @CurrentUser('id') reviewerId: string,
    @Body() dto: ReviewExpenseOrderReductionDto,
  ) {
    return this.service.approve(requestId, reviewerId, dto);
  }

  @Put(':requestId/reject')
  @RequirePermissions('read_expense_orders')
  @ApiOperation({ summary: 'Rechazar (admin distinto de quien la pidió)' })
  @ApiParam({ name: 'requestId', description: 'ID de la solicitud' })
  async reject(
    @Param('requestId') requestId: string,
    @CurrentUser('id') reviewerId: string,
    @Body() dto: ReviewExpenseOrderReductionDto,
  ) {
    return this.service.reject(requestId, reviewerId, dto);
  }

  @Post(':requestId/refund')
  @RequirePermissions('caja_authorize_expense_orders')
  @ApiOperation({
    summary: 'Caja registra el reintegro que devolvió el proveedor',
  })
  @ApiParam({ name: 'requestId', description: 'ID de la solicitud' })
  async registerRefund(
    @Param('requestId') requestId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: RegisterReductionRefundDto,
  ) {
    return this.service.registerRefund(requestId, userId, dto);
  }
}
