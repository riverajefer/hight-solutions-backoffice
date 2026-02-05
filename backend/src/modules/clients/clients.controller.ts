import {
  Controller,
  Get,
  Post,
  Put,
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
import { ClientsService } from './clients.service';
import { CreateClientDto, UpdateClientDto, UploadClientsResponseDto } from './dto';

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
  @ApiResponse({
    status: 200,
    description: 'Lista de clientes con información de ubicación',
  })
  findAll(@Query('includeInactive') includeInactive?: string) {
    return this.clientsService.findAll(includeInactive === 'true');
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
  create(@Body() createClientDto: CreateClientDto) {
    return this.clientsService.create(createClientDto);
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
