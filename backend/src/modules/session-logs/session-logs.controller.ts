import { Controller, Get, Query, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { SessionLogsService } from './session-logs.service';
import { SessionLogsFilterDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';

@ApiTags('session-logs')
@Controller('session-logs')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class SessionLogsController {
  constructor(private readonly sessionLogsService: SessionLogsService) {}

  @Get()
  @RequirePermissions('read_session_logs')
  @ApiOperation({ summary: 'Obtener historial de sesiones con filtros y paginación' })
  @ApiResponse({ status: 200, description: 'Listado de sesiones obtenido exitosamente' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 403, description: 'Sin permisos suficientes' })
  async findAll(@Query() filters: SessionLogsFilterDto) {
    return this.sessionLogsService.findAll(filters);
  }

  @Get('user/:userId')
  @RequirePermissions('read_session_logs')
  @ApiOperation({ summary: 'Obtener historial de sesiones de un usuario específico' })
  @ApiResponse({ status: 200, description: 'Sesiones del usuario obtenidas exitosamente' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 403, description: 'Sin permisos suficientes' })
  async findByUser(
    @Param('userId') userId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.sessionLogsService.findByUserId(
      userId,
      page ? parseInt(page.toString()) : 1,
      limit ? parseInt(limit.toString()) : 10,
    );
  }

  @Get('active')
  @RequirePermissions('read_session_logs')
  @ApiOperation({ summary: 'Obtener sesiones actualmente activas' })
  @ApiResponse({ status: 200, description: 'Sesiones activas obtenidas exitosamente' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 403, description: 'Sin permisos suficientes' })
  async getActiveSessions() {
    return this.sessionLogsService.getActiveSessions();
  }
}
