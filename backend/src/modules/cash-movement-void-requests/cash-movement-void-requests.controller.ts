import {
  Controller,
  Post,
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
import { CashMovementVoidRequestsService } from './cash-movement-void-requests.service';
import { CreateVoidRequestDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('cash-movement-void-requests')
@ApiBearerAuth('JWT-auth')
@Controller('cash-movements/:movementId/void-requests')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class CashMovementVoidRequestsController {
  constructor(
    private readonly service: CashMovementVoidRequestsService,
  ) {}

  @Post()
  @RequirePermissions('void_cash_movements')
  @ApiOperation({ summary: 'Crear solicitud de anulación de movimiento de caja' })
  @ApiParam({ name: 'movementId', description: 'ID del movimiento de caja' })
  @ApiResponse({ status: 201, description: 'Solicitud creada correctamente' })
  @ApiResponse({ status: 400, description: 'Movimiento ya anulado o solicitud pendiente existente' })
  async create(
    @Param('movementId') movementId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CreateVoidRequestDto,
  ) {
    return this.service.create(movementId, userId, dto);
  }
}
