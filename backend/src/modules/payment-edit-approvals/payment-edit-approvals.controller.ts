import { Controller, Get, Put, Body, Param, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { PaymentEditApprovalsService } from './payment-edit-approvals.service';
import {
  ApprovePaymentEditApprovalDto,
  RejectPaymentEditApprovalDto,
} from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('payment-edit-approvals')
@ApiBearerAuth('JWT-auth')
@Controller('payment-edit-approvals')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class PaymentEditApprovalsController {
  constructor(private readonly service: PaymentEditApprovalsService) {}

  @Get('pending')
  @RequirePermissions('approve_payment_edits')
  @ApiOperation({ summary: 'Listar solicitudes de edición de pago pendientes' })
  @ApiResponse({ status: 200, description: 'Solicitudes pendientes' })
  async findPending() {
    return this.service.findPendingRequests();
  }

  @Get('all')
  @RequirePermissions('approve_payment_edits')
  @ApiOperation({ summary: 'Listar todas las solicitudes de edición de pago' })
  @ApiResponse({ status: 200, description: 'Todas las solicitudes' })
  async findAll() {
    return this.service.findAll();
  }

  @Get('my')
  @RequirePermissions('edit_order_payments')
  @ApiOperation({ summary: 'Obtener solicitudes propias del usuario' })
  @ApiResponse({ status: 200, description: 'Solicitudes del usuario' })
  async findMy(@CurrentUser('id') userId: string) {
    return this.service.findByUser(userId);
  }

  @Get('order/:orderId')
  @RequirePermissions('read_orders')
  @ApiOperation({ summary: 'Listar solicitudes de edición de pago de una orden' })
  @ApiParam({ name: 'orderId', description: 'ID de la orden' })
  @ApiResponse({ status: 200, description: 'Solicitudes de la orden' })
  async findByOrder(@Param('orderId') orderId: string) {
    return this.service.findByOrder(orderId);
  }

  @Put(':id/approve')
  @RequirePermissions('approve_payment_edits')
  @ApiOperation({ summary: 'Aprobar edición de pago' })
  @ApiParam({ name: 'id', description: 'ID de la solicitud' })
  @ApiResponse({ status: 200, description: 'Edición aprobada y aplicada' })
  @ApiResponse({ status: 403, description: 'Sin permiso para aprobar' })
  async approve(
    @Param('id') id: string,
    @CurrentUser('id') reviewerId: string,
    @Body() dto: ApprovePaymentEditApprovalDto,
  ) {
    return this.service.approve(id, reviewerId, dto);
  }

  @Put(':id/reject')
  @RequirePermissions('approve_payment_edits')
  @ApiOperation({ summary: 'Rechazar edición de pago' })
  @ApiParam({ name: 'id', description: 'ID de la solicitud' })
  @ApiResponse({ status: 200, description: 'Edición rechazada' })
  @ApiResponse({ status: 403, description: 'Sin permiso para rechazar' })
  async reject(
    @Param('id') id: string,
    @CurrentUser('id') reviewerId: string,
    @Body() dto: RejectPaymentEditApprovalDto,
  ) {
    return this.service.reject(id, reviewerId, dto);
  }
}
