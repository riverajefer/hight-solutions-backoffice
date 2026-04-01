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
import { DiscountApprovalsService } from './discount-approvals.service';
import {
  ApproveDiscountApprovalDto,
  RejectDiscountApprovalDto,
} from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('discount-approvals')
@ApiBearerAuth('JWT-auth')
@Controller('discount-approvals')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class DiscountApprovalsController {
  constructor(private readonly service: DiscountApprovalsService) {}

  @Get('pending')
  @RequirePermissions('approve_discounts')
  @ApiOperation({ summary: 'Listar solicitudes de aprobación de descuento pendientes' })
  @ApiResponse({ status: 200, description: 'Solicitudes pendientes' })
  async findPending() {
    return this.service.findPendingRequests();
  }

  @Get('all')
  @RequirePermissions('approve_discounts')
  @ApiOperation({ summary: 'Listar todas las solicitudes de aprobación de descuento' })
  @ApiResponse({ status: 200, description: 'Todas las solicitudes' })
  async findAll() {
    return this.service.findAll();
  }

  @Get('my')
  @RequirePermissions('apply_discounts')
  @ApiOperation({ summary: 'Obtener solicitudes de descuento propias del usuario' })
  @ApiResponse({ status: 200, description: 'Solicitudes del usuario' })
  async findMy(@CurrentUser('id') userId: string) {
    return this.service.findByUser(userId);
  }

  @Get(':id')
  @RequirePermissions('approve_discounts')
  @ApiOperation({ summary: 'Obtener una solicitud de aprobación de descuento por id' })
  @ApiParam({ name: 'id', description: 'ID de la solicitud' })
  @ApiResponse({ status: 200, description: 'Solicitud encontrada' })
  @ApiResponse({ status: 404, description: 'Solicitud no encontrada' })
  async findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Put(':id/approve')
  @RequirePermissions('approve_discounts')
  @ApiOperation({ summary: 'Aprobar descuento' })
  @ApiParam({ name: 'id', description: 'ID de la solicitud' })
  @ApiResponse({ status: 200, description: 'Descuento aprobado' })
  @ApiResponse({ status: 403, description: 'Sin permiso para aprobar' })
  async approve(
    @Param('id') id: string,
    @CurrentUser('id') reviewerId: string,
    @Body() dto: ApproveDiscountApprovalDto,
  ) {
    return this.service.approve(id, reviewerId, dto);
  }

  @Put(':id/reject')
  @RequirePermissions('approve_discounts')
  @ApiOperation({ summary: 'Rechazar descuento' })
  @ApiParam({ name: 'id', description: 'ID de la solicitud' })
  @ApiResponse({ status: 200, description: 'Descuento rechazado' })
  @ApiResponse({ status: 403, description: 'Sin permiso para rechazar' })
  async reject(
    @Param('id') id: string,
    @CurrentUser('id') reviewerId: string,
    @Body() dto: RejectDiscountApprovalDto,
  ) {
    return this.service.reject(id, reviewerId, dto);
  }
}
