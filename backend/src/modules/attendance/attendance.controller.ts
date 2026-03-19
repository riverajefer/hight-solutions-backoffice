import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Query,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
  Ip,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AttendanceService } from './attendance.service';
import { ClockInDto, ClockOutDto, AttendanceFilterDto, AdjustAttendanceDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../common/interfaces';

@ApiTags('attendance')
@Controller('attendance')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Post('clock-in')
  @RequirePermissions('use_attendance')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Marcar entrada de asistencia' })
  @ApiResponse({ status: 201, description: 'Entrada registrada exitosamente' })
  @ApiResponse({ status: 409, description: 'Ya tienes una entrada activa' })
  async clockIn(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ClockInDto,
    @Ip() ip: string,
  ) {
    console.log('Incoming clockIn DTO:', dto);
    return this.attendanceService.clockIn(user.id, dto, ip);
  }

  @Post('clock-out')
  @RequirePermissions('use_attendance')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Marcar salida de asistencia' })
  @ApiResponse({ status: 200, description: 'Salida registrada exitosamente' })
  @ApiResponse({ status: 404, description: 'No hay entrada activa' })
  async clockOut(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ClockOutDto,
  ) {
    return this.attendanceService.clockOut(user.id, dto);
  }

  @Get('my-status')
  @RequirePermissions('use_attendance')
  @ApiOperation({ summary: 'Estado actual de asistencia del usuario' })
  @ApiResponse({ status: 200, description: 'Estado de asistencia obtenido' })
  async getMyStatus(@CurrentUser() user: AuthenticatedUser) {
    return this.attendanceService.getMyStatus(user.id);
  }

  @Get('my-records')
  @RequirePermissions('use_attendance')
  @ApiOperation({ summary: 'Mis registros de asistencia con filtros' })
  @ApiResponse({ status: 200, description: 'Registros obtenidos exitosamente' })
  async getMyRecords(
    @CurrentUser() user: AuthenticatedUser,
    @Query() filters: AttendanceFilterDto,
  ) {
    return this.attendanceService.getMyRecords(user.id, filters);
  }

  @Get('records')
  @RequirePermissions('read_attendance')
  @ApiOperation({ summary: '(Admin) Todos los registros de asistencia con filtros' })
  @ApiResponse({ status: 200, description: 'Registros obtenidos exitosamente' })
  async findAll(@Query() filters: AttendanceFilterDto) {
    return this.attendanceService.findAll(filters);
  }

  @Post('heartbeat')
  @RequirePermissions('use_attendance')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Registrar heartbeat de actividad' })
  @ApiResponse({ status: 204, description: 'Heartbeat registrado' })
  async heartbeat(@CurrentUser() user: AuthenticatedUser) {
    await this.attendanceService.recordHeartbeat(user.id, '/attendance/heartbeat');
  }

  @Patch(':id/adjust')
  @RequirePermissions('manage_attendance')
  @ApiOperation({ summary: '(Admin) Corregir un registro de asistencia' })
  @ApiResponse({ status: 200, description: 'Registro ajustado exitosamente' })
  @ApiResponse({ status: 404, description: 'Registro no encontrado' })
  async adjustRecord(
    @Param('id') id: string,
    @Body() dto: AdjustAttendanceDto,
  ) {
    return this.attendanceService.adjustRecord(id, dto);
  }
}
