import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../common/interfaces/auth.interface';
import { AccountsPayablePaymentReversalRequestsService } from './accounts-payable-payment-reversal-requests.service';
import {
  CajaRejectApPaymentReversalDto,
  CreateApPaymentReversalRequestDto,
  GerenciaRejectApPaymentReversalDto,
} from './dto';

@ApiTags('accounts-payable-payment-reversal-requests')
@ApiBearerAuth('JWT-auth')
@Controller('accounts-payable-payment-reversal-requests')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AccountsPayablePaymentReversalRequestsController {
  constructor(private readonly service: AccountsPayablePaymentReversalRequestsService) {}

  @Post()
  @RequirePermissions('request_ap_payment_reversal')
  @ApiOperation({ summary: 'Crear solicitud de reversión de pago de CP' })
  @ApiResponse({ status: 201, description: 'Solicitud creada — pendiente de aprobación de Gerencia' })
  create(
    @Body() dto: CreateApPaymentReversalRequestDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.create(user.id, dto);
  }

  @Get('pending-gerencia')
  @RequirePermissions('gerencia_approve_ap_payment_reversal')
  @ApiOperation({ summary: 'Listar reversiones pendientes de aprobación por Gerencia (paso 1)' })
  findPendingGerencia() {
    return this.service.findPendingGerencia();
  }

  @Get('pending-caja')
  @RequirePermissions('caja_confirm_ap_payment_reversal')
  @ApiOperation({ summary: 'Listar reversiones pendientes de confirmación por Caja (paso 2)' })
  findPendingCaja() {
    return this.service.findPendingCaja();
  }

  @Get('all')
  @RequirePermissions('gerencia_approve_ap_payment_reversal')
  @ApiOperation({ summary: 'Historial completo de solicitudes de reversión' })
  findAll() {
    return this.service.findAll();
  }

  @Get('by-payment-auth-request/:paymentAuthRequestId')
  @RequirePermissions('read_accounts_payable')
  @ApiOperation({ summary: 'Obtener reversión asociada a una solicitud de pago' })
  @ApiParam({ name: 'paymentAuthRequestId', description: 'ID de la solicitud de pago' })
  findByPaymentAuthRequest(@Param('paymentAuthRequestId') paymentAuthRequestId: string) {
    return this.service.findByPaymentAuthRequest(paymentAuthRequestId);
  }

  @Get(':id')
  @RequirePermissions('read_accounts_payable')
  @ApiOperation({ summary: 'Obtener solicitud de reversión por ID' })
  @ApiParam({ name: 'id', description: 'ID de la solicitud de reversión' })
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Patch(':id/gerencia-approve')
  @RequirePermissions('gerencia_approve_ap_payment_reversal')
  @ApiOperation({ summary: 'Paso 1 — Gerencia aprueba la reversión del pago' })
  @ApiParam({ name: 'id', description: 'ID de la solicitud de reversión' })
  @ApiResponse({ status: 200, description: 'Aprobado por Gerencia — pendiente de Caja' })
  gerenciaApprove(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.service.gerenciaApprove(id, user.id);
  }

  @Patch(':id/gerencia-reject')
  @RequirePermissions('gerencia_approve_ap_payment_reversal')
  @ApiOperation({ summary: 'Paso 1 — Gerencia rechaza la reversión del pago' })
  @ApiParam({ name: 'id', description: 'ID de la solicitud de reversión' })
  gerenciaReject(
    @Param('id') id: string,
    @Body() dto: GerenciaRejectApPaymentReversalDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.gerenciaReject(id, user.id, dto);
  }

  @Patch(':id/caja-approve')
  @RequirePermissions('caja_confirm_ap_payment_reversal')
  @ApiOperation({ summary: 'Paso 2 — Caja confirma y ejecuta la reversión del pago' })
  @ApiParam({ name: 'id', description: 'ID de la solicitud de reversión' })
  @ApiResponse({ status: 200, description: 'Reversión ejecutada — pago revertido y CashMovement anulado' })
  cajaApprove(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.service.cajaApprove(id, user);
  }

  @Patch(':id/caja-reject')
  @RequirePermissions('caja_confirm_ap_payment_reversal')
  @ApiOperation({ summary: 'Paso 2 — Caja rechaza la reversión del pago' })
  @ApiParam({ name: 'id', description: 'ID de la solicitud de reversión' })
  cajaReject(
    @Param('id') id: string,
    @Body() dto: CajaRejectApPaymentReversalDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.cajaReject(id, user, dto);
  }
}
