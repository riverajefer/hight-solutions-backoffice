import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ExpenseOrderReductionRequestsService } from './expense-order-reduction-requests.service';
import { CreateExpenseOrderReductionDto, PreviewExpenseOrderReductionDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

/** Pedir bajar el valor de una OG pagada. Cualquiera que vea la OG puede pedirlo. */
@ApiTags('expense-order-reduction-requests')
@ApiBearerAuth('JWT-auth')
@Controller('expense-orders/:expenseOrderId/reduction-requests')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ExpenseOrderReductionRequestsController {
  constructor(private readonly service: ExpenseOrderReductionRequestsService) {}

  @Post('preview')
  @RequirePermissions('read_expense_orders')
  @ApiOperation({
    summary: 'Calcular el valor nuevo, la diferencia y su efecto en caja (no guarda nada)',
  })
  @ApiParam({ name: 'expenseOrderId', description: 'ID de la OG' })
  async preview(
    @Param('expenseOrderId') expenseOrderId: string,
    @Body() dto: PreviewExpenseOrderReductionDto,
  ) {
    return this.service.preview(expenseOrderId, dto);
  }

  @Get()
  @RequirePermissions('read_expense_orders')
  @ApiOperation({ summary: 'Solicitudes para bajar el valor de la OG' })
  @ApiParam({ name: 'expenseOrderId', description: 'ID de la OG' })
  async findByExpenseOrder(@Param('expenseOrderId') expenseOrderId: string) {
    return this.service.findByExpenseOrder(expenseOrderId);
  }

  @Post()
  @RequirePermissions('read_expense_orders')
  @ApiOperation({ summary: 'Solicitar bajar el valor de la OG pagada' })
  @ApiParam({ name: 'expenseOrderId', description: 'ID de la OG' })
  @ApiResponse({ status: 201, description: 'Solicitud creada' })
  async create(
    @Param('expenseOrderId') expenseOrderId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CreateExpenseOrderReductionDto,
  ) {
    return this.service.create(expenseOrderId, userId, dto);
  }
}
