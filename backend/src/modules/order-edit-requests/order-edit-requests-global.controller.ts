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
import { OrderEditRequestsService } from './order-edit-requests.service';
import { ReviewEditRequestDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('order-edit-requests')
@ApiBearerAuth('JWT-auth')
@Controller('order-edit-requests')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class OrderEditRequestsGlobalController {
  constructor(
    private readonly orderEditRequestsService: OrderEditRequestsService,
  ) {}

  @Get('pending')
  @RequirePermissions('approve_orders')
  @ApiOperation({ summary: 'Listar todas las solicitudes de edición pendientes (solo admins)' })
  @ApiResponse({
    status: 200,
    description: 'Solicitudes pendientes obtenidas correctamente',
  })
  async findAllPending() {
    return this.orderEditRequestsService.findAllPending();
  }

  @Put(':requestId/approve')
  @RequirePermissions('approve_orders')
  @ApiOperation({ summary: 'Aprobar solicitud de edición por ID global (solo admin)' })
  @ApiParam({ name: 'requestId', description: 'ID de la solicitud' })
  @ApiResponse({ status: 200, description: 'Solicitud aprobada' })
  async approve(
    @Param('requestId') requestId: string,
    @CurrentUser('id') adminId: string,
    @Body() dto: ReviewEditRequestDto,
  ) {
    // Get the request first to find orderId
    const request = await this.orderEditRequestsService.findOneById(requestId);
    return this.orderEditRequestsService.approve(
      request.orderId,
      requestId,
      adminId,
      dto,
    );
  }

  @Put(':requestId/reject')
  @RequirePermissions('approve_orders')
  @ApiOperation({ summary: 'Rechazar solicitud de edición por ID global (solo admin)' })
  @ApiParam({ name: 'requestId', description: 'ID de la solicitud' })
  @ApiResponse({ status: 200, description: 'Solicitud rechazada' })
  async reject(
    @Param('requestId') requestId: string,
    @CurrentUser('id') adminId: string,
    @Body() dto: ReviewEditRequestDto,
  ) {
    const request = await this.orderEditRequestsService.findOneById(requestId);
    return this.orderEditRequestsService.reject(
      request.orderId,
      requestId,
      adminId,
      dto,
    );
  }
}
