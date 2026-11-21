import { Body, Controller, Get, Param, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ExpenseOrderVoidRequestsService } from './expense-order-void-requests.service';
import { ReviewExpenseOrderVoidRequestDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

/** Bandeja del admin. El servicio exige rol admin en cada acción. */
@ApiTags('expense-order-void-requests')
@ApiBearerAuth('JWT-auth')
@Controller('expense-order-void-requests')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ExpenseOrderVoidRequestsGlobalController {
  constructor(private readonly service: ExpenseOrderVoidRequestsService) {}

  @Get('pending')
  @RequirePermissions('read_expense_orders')
  @ApiOperation({ summary: 'Anulaciones de OG pendientes, con su plan (solo admin)' })
  async findAllPending(@CurrentUser('id') userId: string) {
    return this.service.findAllPending(userId);
  }

  @Get('all')
  @RequirePermissions('read_expense_orders')
  @ApiOperation({ summary: 'Historial de anulaciones de OG, últimas 200 (solo admin)' })
  async findAll(@CurrentUser('id') userId: string) {
    return this.service.findAll(userId);
  }

  @Put(':requestId/approve')
  @RequirePermissions('read_expense_orders')
  @ApiOperation({ summary: 'Aprobar y aplicar la anulación (admin distinto de quien la pidió)' })
  @ApiParam({ name: 'requestId', description: 'ID de la solicitud' })
  @ApiResponse({ status: 200, description: 'OG anulada' })
  async approve(
    @Param('requestId') requestId: string,
    @CurrentUser('id') reviewerId: string,
    @Body() dto: ReviewExpenseOrderVoidRequestDto,
  ) {
    return this.service.approve(requestId, reviewerId, dto);
  }

  @Put(':requestId/reject')
  @RequirePermissions('read_expense_orders')
  @ApiOperation({ summary: 'Rechazar la anulación (admin distinto de quien la pidió)' })
  @ApiParam({ name: 'requestId', description: 'ID de la solicitud' })
  @ApiResponse({ status: 200, description: 'Solicitud rechazada' })
  async reject(
    @Param('requestId') requestId: string,
    @CurrentUser('id') reviewerId: string,
    @Body() dto: ReviewExpenseOrderVoidRequestDto,
  ) {
    return this.service.reject(requestId, reviewerId, dto);
  }
}
