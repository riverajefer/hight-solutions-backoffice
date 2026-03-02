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
import { AdvancePaymentApprovalsService } from './advance-payment-approvals.service';
import {
  ApproveAdvancePaymentApprovalDto,
  RejectAdvancePaymentApprovalDto,
} from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('advance-payment-approvals')
@ApiBearerAuth('JWT-auth')
@Controller('advance-payment-approvals')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AdvancePaymentApprovalsController {
  constructor(private readonly service: AdvancePaymentApprovalsService) {}

  @Get('pending')
  @RequirePermissions('approve_advance_payments')
  @ApiOperation({ summary: 'Listar solicitudes de anticipo pendientes' })
  @ApiResponse({ status: 200, description: 'Solicitudes pendientes' })
  async findPending() {
    return this.service.findPendingRequests();
  }

  @Get('all')
  @RequirePermissions('approve_advance_payments')
  @ApiOperation({ summary: 'Listar todas las solicitudes de anticipo' })
  @ApiResponse({ status: 200, description: 'Todas las solicitudes' })
  async findAll() {
    return this.service.findAll();
  }

  @Get('my')
  @RequirePermissions('create_orders')
  @ApiOperation({ summary: 'Obtener solicitudes propias del usuario' })
  @ApiResponse({ status: 200, description: 'Solicitudes del usuario' })
  async findMy(@CurrentUser('id') userId: string) {
    return this.service.findByUser(userId);
  }

  @Put(':id/approve')
  @RequirePermissions('approve_advance_payments')
  @ApiOperation({ summary: 'Aprobar anticipo' })
  @ApiParam({ name: 'id', description: 'ID de la solicitud' })
  @ApiResponse({ status: 200, description: 'Anticipo aprobado' })
  @ApiResponse({ status: 403, description: 'Sin permiso para aprobar' })
  async approve(
    @Param('id') id: string,
    @CurrentUser('id') reviewerId: string,
    @Body() dto: ApproveAdvancePaymentApprovalDto,
  ) {
    return this.service.approve(id, reviewerId, dto);
  }

  @Put(':id/reject')
  @RequirePermissions('approve_advance_payments')
  @ApiOperation({ summary: 'Rechazar anticipo' })
  @ApiParam({ name: 'id', description: 'ID de la solicitud' })
  @ApiResponse({ status: 200, description: 'Anticipo rechazado' })
  @ApiResponse({ status: 403, description: 'Sin permiso para rechazar' })
  async reject(
    @Param('id') id: string,
    @CurrentUser('id') reviewerId: string,
    @Body() dto: RejectAdvancePaymentApprovalDto,
  ) {
    return this.service.reject(id, reviewerId, dto);
  }
}
