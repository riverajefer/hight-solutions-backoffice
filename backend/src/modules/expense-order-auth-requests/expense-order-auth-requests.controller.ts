import {
  Controller,
  Get,
  Post,
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
import { ExpenseOrderAuthRequestsService } from './expense-order-auth-requests.service';
import {
  ApproveExpenseOrderAuthRequestDto,
  CreateExpenseOrderAuthRequestDto,
  RejectExpenseOrderAuthRequestDto,
} from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('expense-order-auth-requests')
@ApiBearerAuth('JWT-auth')
@Controller('expense-order-auth-requests')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ExpenseOrderAuthRequestsController {
  constructor(private readonly service: ExpenseOrderAuthRequestsService) {}

  @Post()
  @RequirePermissions('update_expense_orders')
  @ApiOperation({ summary: 'Crear solicitud de autorización de OG' })
  @ApiResponse({ status: 201, description: 'Solicitud creada correctamente' })
  @ApiResponse({ status: 400, description: 'Solicitud duplicada o usuario es admin' })
  async create(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateExpenseOrderAuthRequestDto,
  ) {
    return this.service.create(userId, dto);
  }

  @Get('pending')
  @RequirePermissions('approve_expense_orders')
  @ApiOperation({ summary: 'Listar solicitudes pendientes (solo admins)' })
  @ApiResponse({ status: 200, description: 'Solicitudes pendientes' })
  async findPending() {
    return this.service.findPendingRequests();
  }

  @Get('all')
  @RequirePermissions('approve_expense_orders')
  @ApiOperation({ summary: 'Listar todas las solicitudes (solo admins)' })
  @ApiResponse({ status: 200, description: 'Todas las solicitudes' })
  async findAll() {
    return this.service.findAll();
  }

  @Get('my')
  @RequirePermissions('update_expense_orders')
  @ApiOperation({ summary: 'Obtener solicitudes propias del usuario' })
  @ApiResponse({ status: 200, description: 'Solicitudes del usuario' })
  async findMy(@CurrentUser('id') userId: string) {
    return this.service.findByUser(userId);
  }

  @Put(':id/approve')
  @RequirePermissions('approve_expense_orders')
  @ApiOperation({ summary: 'Aprobar solicitud (solo admin)' })
  @ApiParam({ name: 'id', description: 'ID de la solicitud' })
  @ApiResponse({ status: 200, description: 'Solicitud aprobada' })
  @ApiResponse({ status: 403, description: 'Solo administradores pueden aprobar' })
  async approve(
    @Param('id') id: string,
    @CurrentUser('id') adminId: string,
    @Body() dto: ApproveExpenseOrderAuthRequestDto,
  ) {
    return this.service.approve(id, adminId, dto);
  }

  @Put(':id/reject')
  @RequirePermissions('approve_expense_orders')
  @ApiOperation({ summary: 'Rechazar solicitud (solo admin)' })
  @ApiParam({ name: 'id', description: 'ID de la solicitud' })
  @ApiResponse({ status: 200, description: 'Solicitud rechazada' })
  @ApiResponse({ status: 403, description: 'Solo administradores pueden rechazar' })
  async reject(
    @Param('id') id: string,
    @CurrentUser('id') adminId: string,
    @Body() dto: RejectExpenseOrderAuthRequestDto,
  ) {
    return this.service.reject(id, adminId, dto);
  }
}
