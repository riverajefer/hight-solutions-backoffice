import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Request as NestRequest,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { ProspectsService } from './prospects.service';
import {
  ConvertProspectDto,
  CreateProspectContactDto,
  CreateProspectDto,
  FilterProspectsDto,
  ProspectMetricsFilterDto,
  UpdateProspectDto,
} from './dto';

interface AuthenticatedRequest extends Request {
  user: { id: string; email: string };
}

@ApiTags('Pipeline de Ventas')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('prospects')
export class ProspectsController {
  constructor(private readonly prospectsService: ProspectsService) {}

  @Post()
  @RequirePermissions('create_prospects')
  @ApiOperation({
    summary:
      'Crear un prospecto. Basta con un dato de contacto: nombre, celular o correo.',
  })
  create(
    @Body() dto: CreateProspectDto,
    @NestRequest() req: AuthenticatedRequest,
  ) {
    return this.prospectsService.create(dto, req.user.id);
  }

  @Get()
  @RequirePermissions('read_prospects')
  @ApiOperation({ summary: 'Listar prospectos con filtros' })
  findAll(
    @Query() filters: FilterProspectsDto,
    @NestRequest() req: AuthenticatedRequest,
  ) {
    return this.prospectsService.findAll(filters, req.user.id);
  }

  // Debe declararse antes de `:id` para que "metrics" no se interprete como un id.
  @Get('metrics')
  @RequirePermissions('read_prospect_metrics')
  @ApiOperation({ summary: 'Métricas del pipeline por vendedora' })
  getMetrics(
    @Query() filters: ProspectMetricsFilterDto,
    @NestRequest() req: AuthenticatedRequest,
  ) {
    return this.prospectsService.getMetrics(filters, req.user.id);
  }

  @Get(':id')
  @RequirePermissions('read_prospects')
  @ApiOperation({ summary: 'Detalle de un prospecto con su historial de contactos' })
  findOne(@Param('id') id: string, @NestRequest() req: AuthenticatedRequest) {
    return this.prospectsService.findOne(id, req.user.id);
  }

  @Patch(':id')
  @RequirePermissions('update_prospects')
  @ApiOperation({ summary: 'Actualizar un prospecto' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateProspectDto,
    @NestRequest() req: AuthenticatedRequest,
  ) {
    return this.prospectsService.update(id, dto, req.user.id);
  }

  @Delete(':id')
  @RequirePermissions('delete_prospects')
  @ApiOperation({ summary: 'Eliminar un prospecto' })
  remove(@Param('id') id: string, @NestRequest() req: AuthenticatedRequest) {
    return this.prospectsService.remove(id, req.user.id);
  }

  @Post(':id/contacts')
  @RequirePermissions('update_prospects')
  @ApiOperation({ summary: 'Registrar un contacto al prospecto' })
  addContact(
    @Param('id') id: string,
    @Body() dto: CreateProspectContactDto,
    @NestRequest() req: AuthenticatedRequest,
  ) {
    return this.prospectsService.addContact(id, dto, req.user.id);
  }

  @Delete(':id/contacts/:contactId')
  @RequirePermissions('update_prospects')
  @ApiOperation({ summary: 'Eliminar un contacto del prospecto' })
  removeContact(
    @Param('id') id: string,
    @Param('contactId') contactId: string,
    @NestRequest() req: AuthenticatedRequest,
  ) {
    return this.prospectsService.removeContact(id, contactId, req.user.id);
  }

  @Post(':id/convert')
  @RequirePermissions('convert_prospects')
  @ApiOperation({ summary: 'Vincular el prospecto a un cliente para cotizarlo' })
  convert(
    @Param('id') id: string,
    @Body() dto: ConvertProspectDto,
    @NestRequest() req: AuthenticatedRequest,
  ) {
    return this.prospectsService.convert(id, dto, req.user.id);
  }
}
