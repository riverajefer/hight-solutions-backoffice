import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CashSessionService } from './cash-session.service';
import {
  CloseCashSessionDto,
  FilterCashSessionsDto,
  OpenCashSessionDto,
} from './dto';

@ApiTags('cash-sessions')
@ApiBearerAuth()
@Controller('cash-sessions')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class CashSessionController {
  constructor(private readonly service: CashSessionService) {}

  @Get()
  @RequirePermissions('read_cash_sessions')
  @ApiOperation({ summary: 'Listar sesiones de caja con filtros' })
  findAll(@Query() filters: FilterCashSessionsDto) {
    return this.service.findAll(filters);
  }

  @Get(':id')
  @RequirePermissions('read_cash_sessions')
  @ApiOperation({ summary: 'Obtener detalle completo de una sesión de caja' })
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Get(':id/balance-preview')
  @RequirePermissions('read_cash_sessions')
  @ApiOperation({ summary: 'Obtener balance actual sin cerrar la caja (arqueo rápido)' })
  getBalancePreview(@Param('id') id: string) {
    return this.service.getBalancePreview(id);
  }

  @Post('open')
  @RequirePermissions('open_cash_session')
  @ApiOperation({ summary: 'Abrir una nueva sesión de caja' })
  @ApiResponse({ status: 201, description: 'Sesión abierta correctamente' })
  @ApiResponse({ status: 409, description: 'La caja ya tiene una sesión abierta' })
  openSession(
    @Body() dto: OpenCashSessionDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.service.openSession(dto, userId);
  }

  @Post(':id/close')
  @RequirePermissions('close_cash_session')
  @ApiOperation({ summary: 'Cerrar la sesión de caja con conteo de denominaciones' })
  @ApiResponse({ status: 200, description: 'Sesión cerrada con resumen de conciliación' })
  closeSession(
    @Param('id') id: string,
    @Body() dto: CloseCashSessionDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.service.closeSession(id, dto, userId);
  }
}
