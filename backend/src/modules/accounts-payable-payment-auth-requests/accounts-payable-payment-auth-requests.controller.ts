import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../common/interfaces/auth.interface';
import { AccountsPayablePaymentAuthRequestsService } from './accounts-payable-payment-auth-requests.service';
import {
  AdminApproveApPaymentAuthRequestDto,
  AdminRejectApPaymentAuthRequestDto,
  CajaRejectApPaymentAuthRequestDto,
  CreateApPaymentAuthRequestDto,
} from './dto';

@ApiTags('accounts-payable-payment-auth-requests')
@ApiBearerAuth('JWT-auth')
@Controller('accounts-payable-payment-auth-requests')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AccountsPayablePaymentAuthRequestsController {
  constructor(private readonly service: AccountsPayablePaymentAuthRequestsService) {}

  @Post()
  @RequirePermissions('create_accounts_payable')
  @ApiOperation({ summary: 'Crear solicitud de pago de CP (paso 1 de doble aprobación)' })
  @ApiResponse({ status: 201, description: 'Solicitud creada y admins notificados' })
  create(
    @Body() dto: CreateApPaymentAuthRequestDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.create(user.id, dto);
  }

  @Get('pending-admin')
  @RequirePermissions('approve_accounts_payable')
  @ApiOperation({ summary: 'Listar solicitudes pendientes de aprobación por Admin (paso 1)' })
  findPendingAdmin() {
    return this.service.findPendingAdmin();
  }

  @Get('pending-caja')
  @RequirePermissions('caja_authorize_ap_payment')
  @ApiOperation({ summary: 'Listar solicitudes pendientes de autorización por Caja (paso 2)' })
  findPendingCaja() {
    return this.service.findPendingCaja();
  }

  @Get('all')
  @RequirePermissions('approve_accounts_payable')
  @ApiOperation({ summary: 'Listar todas las solicitudes (historial)' })
  findAll() {
    return this.service.findAll();
  }

  @Get('my')
  @RequirePermissions('create_accounts_payable')
  @ApiOperation({ summary: 'Listar solicitudes propias del usuario autenticado' })
  findByUser(@CurrentUser() user: AuthenticatedUser) {
    return this.service.findByUser(user.id);
  }

  @Get('by-account-payable/:accountPayableId')
  @RequirePermissions('read_accounts_payable')
  @ApiOperation({ summary: 'Listar solicitudes de pago de una CP específica' })
  @ApiParam({ name: 'accountPayableId', description: 'ID de la Cuenta por Pagar' })
  findByAccountPayable(@Param('accountPayableId') accountPayableId: string) {
    return this.service.findByAccountPayable(accountPayableId);
  }

  @Get(':id')
  @RequirePermissions('read_accounts_payable')
  @ApiOperation({ summary: 'Obtener solicitud por ID' })
  @ApiParam({ name: 'id', description: 'ID de la solicitud' })
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Patch(':id/admin-approve')
  @RequirePermissions('approve_accounts_payable')
  @ApiOperation({ summary: 'Paso 1 — Admin aprueba la solicitud de pago' })
  @ApiParam({ name: 'id', description: 'ID de la solicitud' })
  @ApiResponse({ status: 200, description: 'Aprobado por admin, notificación enviada a Caja' })
  adminApprove(
    @Param('id') id: string,
    @Body() dto: AdminApproveApPaymentAuthRequestDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.adminApprove(id, user.id, dto);
  }

  @Patch(':id/admin-reject')
  @RequirePermissions('approve_accounts_payable')
  @ApiOperation({ summary: 'Paso 1 — Admin rechaza la solicitud de pago' })
  @ApiParam({ name: 'id', description: 'ID de la solicitud' })
  adminReject(
    @Param('id') id: string,
    @Body() dto: AdminRejectApPaymentAuthRequestDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.adminReject(id, user.id, dto);
  }

  @Patch(':id/caja-approve')
  @RequirePermissions('caja_authorize_ap_payment')
  @ApiOperation({ summary: 'Paso 2 — Caja autoriza y registra el pago' })
  @ApiParam({ name: 'id', description: 'ID de la solicitud' })
  @ApiResponse({ status: 200, description: 'Pago registrado y movimiento de caja creado' })
  cajaApprove(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.cajaApprove(id, user);
  }

  @Patch(':id/caja-reject')
  @RequirePermissions('caja_authorize_ap_payment')
  @ApiOperation({ summary: 'Paso 2 — Caja rechaza la solicitud de pago' })
  @ApiParam({ name: 'id', description: 'ID de la solicitud' })
  cajaReject(
    @Param('id') id: string,
    @Body() dto: CajaRejectApPaymentAuthRequestDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.cajaReject(id, dto, user);
  }
}
