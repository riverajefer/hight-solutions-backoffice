import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { QuoteRestoreRequestsService } from './quote-restore-requests.service';
import {
  CreateQuoteRestoreRequestDto,
  ApproveQuoteRestoreRequestDto,
  RejectQuoteRestoreRequestDto,
} from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('quote-restore-requests')
@ApiBearerAuth('JWT-auth')
@Controller('quote-restore-requests')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class QuoteRestoreRequestsController {
  constructor(private readonly service: QuoteRestoreRequestsService) {}

  @Post()
  @RequirePermissions('request_quote_restore')
  @ApiOperation({ summary: 'Solicitar la restauración de una cotización rechazada' })
  @ApiResponse({ status: 201, description: 'Solicitud creada correctamente' })
  @ApiResponse({
    status: 400,
    description:
      'La cotización no está rechazada, el solicitante es admin o ya existe una solicitud pendiente',
  })
  async create(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateQuoteRestoreRequestDto,
  ) {
    return this.service.create(userId, dto);
  }

  @Put('direct')
  @RequirePermissions('approve_quote_restore')
  @ApiOperation({
    summary: 'Restaurar una cotización rechazada directamente (solo admin)',
  })
  @ApiResponse({ status: 200, description: 'Cotización restaurada' })
  @ApiResponse({ status: 403, description: 'Solo administradores' })
  async restoreDirectly(
    @CurrentUser('id') adminId: string,
    @Body() dto: CreateQuoteRestoreRequestDto,
  ) {
    return this.service.restoreDirectly(adminId, dto);
  }

  @Get('pending')
  @RequirePermissions('approve_quote_restore')
  @ApiOperation({ summary: 'Listar solicitudes pendientes (solo admins)' })
  @ApiQuery({ name: 'quoteId', required: false })
  @ApiResponse({ status: 200, description: 'Solicitudes pendientes' })
  async findPending(@Query('quoteId') quoteId?: string) {
    return this.service.findPendingRequests(quoteId);
  }

  @Get('all')
  @RequirePermissions('approve_quote_restore')
  @ApiOperation({ summary: 'Listar todas las solicitudes (solo admins)' })
  @ApiQuery({ name: 'quoteId', required: false })
  @ApiResponse({ status: 200, description: 'Todas las solicitudes' })
  async findAll(@Query('quoteId') quoteId?: string) {
    return this.service.findAllRequests(quoteId);
  }

  @Get('my-requests')
  @RequirePermissions('request_quote_restore')
  @ApiOperation({ summary: 'Obtener solicitudes del usuario actual' })
  @ApiResponse({ status: 200, description: 'Solicitudes del usuario' })
  async findMyRequests(@CurrentUser('id') userId: string) {
    return this.service.findByUser(userId);
  }

  @Get('quote/:quoteId')
  @RequirePermissions('read_quotes')
  @ApiOperation({
    summary: 'Obtener la solicitud de restauración pendiente de una cotización',
  })
  @ApiParam({ name: 'quoteId', description: 'ID de la cotización' })
  @ApiResponse({ status: 200, description: 'Solicitud pendiente o null' })
  async findPendingByQuote(@Param('quoteId') quoteId: string) {
    return this.service.findPendingByQuote(quoteId);
  }

  @Put(':id/approve')
  @RequirePermissions('approve_quote_restore')
  @ApiOperation({ summary: 'Aprobar la restauración (solo admin)' })
  @ApiParam({ name: 'id', description: 'ID de la solicitud' })
  @ApiResponse({ status: 200, description: 'Solicitud aprobada y cotización restaurada' })
  @ApiResponse({ status: 403, description: 'Solo administradores pueden aprobar' })
  async approve(
    @Param('id') id: string,
    @CurrentUser('id') adminId: string,
    @Body() dto: ApproveQuoteRestoreRequestDto,
  ) {
    return this.service.approve(id, adminId, dto);
  }

  @Put(':id/reject')
  @RequirePermissions('approve_quote_restore')
  @ApiOperation({ summary: 'Rechazar la restauración (solo admin)' })
  @ApiParam({ name: 'id', description: 'ID de la solicitud' })
  @ApiResponse({ status: 200, description: 'Solicitud rechazada' })
  @ApiResponse({ status: 403, description: 'Solo administradores pueden rechazar' })
  async reject(
    @Param('id') id: string,
    @CurrentUser('id') adminId: string,
    @Body() dto: RejectQuoteRestoreRequestDto,
  ) {
    return this.service.reject(id, adminId, dto);
  }

  @Get(':id')
  @RequirePermissions('request_quote_restore')
  @ApiOperation({ summary: 'Obtener solicitud específica' })
  @ApiParam({ name: 'id', description: 'ID de la solicitud' })
  @ApiResponse({ status: 200, description: 'Solicitud encontrada' })
  @ApiResponse({ status: 404, description: 'Solicitud no encontrada' })
  async findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }
}
