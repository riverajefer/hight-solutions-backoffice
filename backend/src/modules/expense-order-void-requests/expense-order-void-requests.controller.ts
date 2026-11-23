import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ExpenseOrderVoidRequestsService } from './expense-order-void-requests.service';
import { CreateExpenseOrderVoidRequestDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

/**
 * Pedir la anulación de una OG. Cualquiera que vea la OG puede pedirla
 * (decisión del cliente, 2026-11-20); la aprueba un admin.
 */
@ApiTags('expense-order-void-requests')
@ApiBearerAuth('JWT-auth')
@Controller('expense-orders/:expenseOrderId/void-requests')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ExpenseOrderVoidRequestsController {
  constructor(private readonly service: ExpenseOrderVoidRequestsService) {}

  @Get('preview')
  @RequirePermissions('read_expense_orders')
  @ApiOperation({ summary: 'Qué tocaría anular la OG: egresos, cierres, CP y rollos' })
  @ApiParam({ name: 'expenseOrderId', description: 'ID de la OG' })
  @ApiResponse({ status: 200, description: 'Plan de la anulación' })
  async preview(@Param('expenseOrderId') expenseOrderId: string) {
    return this.service.preview(expenseOrderId);
  }

  @Get()
  @RequirePermissions('read_expense_orders')
  @ApiOperation({ summary: 'Solicitudes de anulación de la OG' })
  @ApiParam({ name: 'expenseOrderId', description: 'ID de la OG' })
  async findByExpenseOrder(@Param('expenseOrderId') expenseOrderId: string) {
    return this.service.findByExpenseOrder(expenseOrderId);
  }

  @Post()
  @RequirePermissions('read_expense_orders')
  @ApiOperation({ summary: 'Solicitar la anulación de la OG' })
  @ApiParam({ name: 'expenseOrderId', description: 'ID de la OG' })
  @ApiResponse({ status: 201, description: 'Solicitud creada' })
  @ApiResponse({ status: 400, description: 'La OG no se puede anular' })
  async create(
    @Param('expenseOrderId') expenseOrderId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CreateExpenseOrderVoidRequestDto,
  ) {
    return this.service.create(expenseOrderId, userId, dto);
  }
}
