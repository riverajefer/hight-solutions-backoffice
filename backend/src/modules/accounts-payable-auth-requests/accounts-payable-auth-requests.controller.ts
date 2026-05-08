import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AccountsPayableAuthRequestsService } from './accounts-payable-auth-requests.service';
import { ApproveApAuthRequestDto, CreateApAuthRequestDto, RejectApAuthRequestDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../common/interfaces/auth.interface';

@ApiTags('accounts-payable-auth-requests')
@ApiBearerAuth('JWT-auth')
@Controller('accounts-payable-auth-requests')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AccountsPayableAuthRequestsController {
  constructor(private readonly service: AccountsPayableAuthRequestsService) {}

  @Post()
  @RequirePermissions('create_accounts_payable')
  @ApiOperation({ summary: 'Crear solicitud de autorización de Cuenta por Pagar' })
  @ApiResponse({ status: 201, description: 'Solicitud creada y admins notificados' })
  create(
    @Body() dto: CreateApAuthRequestDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.create(user.id, dto);
  }

  @Get('pending')
  @RequirePermissions('approve_accounts_payable')
  @ApiOperation({ summary: 'Listar solicitudes pendientes de autorización (admins)' })
  findPending() {
    return this.service.findPending();
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

  @Patch(':id/approve')
  @RequirePermissions('approve_accounts_payable')
  @ApiOperation({ summary: 'Aprobar solicitud de autorización de CP' })
  @ApiParam({ name: 'id', description: 'ID de la solicitud' })
  @ApiResponse({ status: 200, description: 'Solicitud aprobada, CP pasa a ADMIN_AUTHORIZED' })
  approve(
    @Param('id') id: string,
    @Body() dto: ApproveApAuthRequestDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.approve(id, user.id, dto);
  }

  @Patch(':id/reject')
  @RequirePermissions('approve_accounts_payable')
  @ApiOperation({ summary: 'Rechazar solicitud de autorización de CP' })
  @ApiParam({ name: 'id', description: 'ID de la solicitud' })
  @ApiResponse({ status: 200, description: 'Solicitud rechazada' })
  reject(
    @Param('id') id: string,
    @Body() dto: RejectApAuthRequestDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.reject(id, user.id, dto);
  }
}
