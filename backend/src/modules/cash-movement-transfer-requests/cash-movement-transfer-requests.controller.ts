import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CashMovementTransferRequestsService } from './cash-movement-transfer-requests.service';
import { CreateTransferRequestDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('cash-movement-transfer-requests')
@ApiBearerAuth('JWT-auth')
@Controller('cash-movements/:movementId/transfer-requests')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class CashMovementTransferRequestsController {
  constructor(private readonly service: CashMovementTransferRequestsService) {}

  @Get('preview')
  @RequirePermissions('request_cash_movement_transfer')
  @ApiOperation({ summary: 'Ver si el movimiento se puede trasladar y cómo queda el cierre de origen' })
  @ApiParam({ name: 'movementId', description: 'ID del movimiento de caja' })
  @ApiResponse({ status: 200, description: 'Vista previa del traslado' })
  async preview(@Param('movementId') movementId: string) {
    return this.service.preview(movementId);
  }

  @Post()
  @RequirePermissions('request_cash_movement_transfer')
  @ApiOperation({ summary: 'Solicitar el traslado de un movimiento de una sesión cerrada a la caja de hoy' })
  @ApiParam({ name: 'movementId', description: 'ID del movimiento de caja' })
  @ApiResponse({ status: 201, description: 'Solicitud creada' })
  @ApiResponse({ status: 400, description: 'El movimiento no se puede trasladar' })
  async create(
    @Param('movementId') movementId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CreateTransferRequestDto,
  ) {
    return this.service.create(movementId, userId, dto);
  }
}
