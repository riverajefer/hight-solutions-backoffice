import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ClientsService } from './clients.service';
import { CreateClientDto, UpdateClientDto, UpdateSpecialConditionDto, UploadClientsResponseDto } from './dto';
import { FilterClientsDto } from './dto/filter-clients.dto';

@ApiTags('clients')
@ApiBearerAuth('JWT-auth')
@Controller('clients')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ClientsController {
  constructor(private readonly clientsService: ClientsService) {}

  @Get()
  @RequirePermissions('read_clients')
  @ApiOperation({ summary: 'Listar todos los clientes' })
  @ApiQuery({
    name: 'includeInactive',
    required: false,
    type: Boolean,
    description: 'Incluir clientes inactivos',
  })
  @ApiQuery({
    name: 'createdAtFrom',
    required: false,
    type: String,
    description: 'Fecha de creación desde (ISO 8601)',
  })
  @ApiQuery({
    name: 'createdAtTo',
    required: false,
    type: String,
    description: 'Fecha de creación hasta (ISO 8601)',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de clientes con información de ubicación',
  })
  findAll(@Query() filters: FilterClientsDto) {
    return this.clientsService.findAll(filters);
  }

  // Debe declararse antes de `@Get(':id')`: si no, "check-duplicate" se
  // interpreta como un id de cliente.
  @Get('check-duplicate')
  @RequirePermissions('create_clients')
  @ApiOperation({
    summary: 'Consultar si ya existe un cliente con estos datos',
    description:
      'Pensado para avisar mientras se llena el formulario, antes de enviarlo. ' +
      'Nivel ALTA = coincide documento y nombre; MEDIA = solo documento; BAJA = solo nombre.',
  })
  @ApiQuery({ name: 'name', required: false })
  @ApiQuery({ name: 'nit', required: false })
  @ApiQuery({ name: 'cedula', required: false })
  @ApiResponse({ status: 200, description: 'Lista de posibles duplicados (vacía si no hay)' })
  checkDuplicate(
    @Query('name') name?: string,
    @Query('nit') nit?: string,
    @Query('cedula') cedula?: string,
  ) {
    return this.clientsService.findDuplicates({ name, nit, cedula });
  }

  @Get(':id/stats')
  @RequirePermissions('read_clients')
  @ApiOperation({ summary: 'Obtener estadísticas financieras y historial de órdenes del cliente' })
  @ApiParam({ name: 'id', description: 'ID del cliente' })
  @ApiResponse({ status: 200, description: 'Estadísticas del cliente' })
  @ApiResponse({ status: 404, description: 'Cliente no encontrado' })
  getStats(@Param('id') id: string) {
    return this.clientsService.getClientStats(id);
  }

  @Get(':id')
  @RequirePermissions('read_clients')
  @ApiOperation({ summary: 'Obtener cliente por ID' })
  @ApiParam({ name: 'id', description: 'ID del cliente' })
  @ApiResponse({
    status: 200,
    description: 'Cliente encontrado',
  })
  @ApiResponse({
    status: 404,
    description: 'Cliente no encontrado',
  })
  findOne(@Param('id') id: string) {
    return this.clientsService.findOne(id);
  }

  @Post('upload')
  @RequirePermissions('create_clients')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 1024 * 1024 }, // 1MB
    }),
  )
  @ApiOperation({ summary: 'Subida masiva de clientes por CSV' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Archivo CSV con datos de clientes',
    type: 'multipart/form-data',
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Resultado de la subida masiva',
    type: UploadClientsResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Archivo inválido o vacío',
  })
  async uploadClients(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No se proporcionó archivo CSV');
    }
    if (!file.originalname.toLowerCase().endsWith('.csv')) {
      throw new BadRequestException('Solo se permiten archivos CSV (.csv)');
    }
    return this.clientsService.uploadClients(file.buffer);
  }

  @Post()
  @RequirePermissions('create_clients')
  @ApiOperation({ summary: 'Crear nuevo cliente' })
  @ApiResponse({
    status: 201,
    description: 'Cliente creado exitosamente',
  })
  @ApiResponse({
    status: 400,
    description: 'Datos inválidos o email duplicado',
  })
  @ApiResponse({
    status: 409,
    description:
      'Posible duplicado. El cuerpo trae `code: POSSIBLE_DUPLICATE` y los clientes ' +
      'que coinciden con sus asesores actuales.',
  })
  @ApiQuery({
    name: 'force',
    required: false,
    type: Boolean,
    description: 'Crear pese al aviso de duplicado',
  })
  create(
    @Body() createClientDto: CreateClientDto,
    @CurrentUser('id') currentUserId: string,
    @Query('force') force?: string,
  ) {
    return this.clientsService.create(createClientDto, currentUserId, {
      force: force === 'true',
    });
  }

  @Put(':id')
  @RequirePermissions('update_clients')
  @ApiOperation({ summary: 'Actualizar cliente' })
  @ApiParam({ name: 'id', description: 'ID del cliente' })
  @ApiResponse({
    status: 200,
    description: 'Cliente actualizado exitosamente',
  })
  @ApiResponse({
    status: 400,
    description: 'Datos inválidos',
  })
  @ApiResponse({
    status: 404,
    description: 'Cliente no encontrado',
  })
  update(@Param('id') id: string, @Body() updateClientDto: UpdateClientDto) {
    return this.clientsService.update(id, updateClientDto);
  }

  @Patch(':id/special-condition')
  @RequirePermissions('update_client_special_condition')
  @ApiOperation({ summary: 'Actualizar condición especial del cliente' })
  @ApiParam({ name: 'id', description: 'ID del cliente' })
  @ApiResponse({
    status: 200,
    description: 'Condición especial actualizada exitosamente',
  })
  @ApiResponse({
    status: 403,
    description: 'Sin permiso para editar la condición especial',
  })
  @ApiResponse({
    status: 404,
    description: 'Cliente no encontrado',
  })
  updateSpecialCondition(
    @Param('id') id: string,
    @Body() body: UpdateSpecialConditionDto,
  ) {
    return this.clientsService.updateSpecialCondition(id, body.specialCondition);
  }

  @Delete(':id')
  @RequirePermissions('delete_clients')
  @ApiOperation({ summary: 'Eliminar cliente (soft delete)' })
  @ApiParam({ name: 'id', description: 'ID del cliente' })
  @ApiResponse({
    status: 200,
    description: 'Cliente eliminado exitosamente',
  })
  @ApiResponse({
    status: 404,
    description: 'Cliente no encontrado',
  })
  remove(@Param('id') id: string) {
    return this.clientsService.remove(id);
  }
}
