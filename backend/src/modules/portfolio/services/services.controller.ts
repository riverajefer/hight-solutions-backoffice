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
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiTags,
  ApiOperation,
  ApiQuery,
} from '@nestjs/swagger';
import { ServicesService } from './services.service';
import { CreateServiceDto, UpdateServiceDto } from './dto';
import { JwtAuthGuard } from '../../auth/guards';
import { PermissionsGuard } from '../../../common/guards';
import { RequirePermissions } from '../../../common/decorators';

@ApiTags('services')
@ApiBearerAuth('JWT-auth')
@Controller('services')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ServicesController {
  constructor(private readonly servicesService: ServicesService) {}

  /**
   * GET /api/v1/services
   * Lista todos los servicios
   * Requiere permiso: read_services
   */
  @Get()
  @RequirePermissions('read_services')
  @ApiOperation({ summary: 'Listar todos los servicios' })
  @ApiQuery({
    name: 'includeInactive',
    required: false,
    type: Boolean,
    description: 'Incluir servicios inactivos',
  })
  @ApiQuery({
    name: 'categoryId',
    required: false,
    type: String,
    description: 'Filtrar por categoría',
  })
  findAll(
    @Query('includeInactive') includeInactive?: string,
    @Query('categoryId') categoryId?: string,
  ) {
    return this.servicesService.findAll(
      includeInactive === 'true',
      categoryId,
    );
  }

  /**
   * GET /api/v1/services/:id
   * Obtiene un servicio por ID
   * Requiere permiso: read_services
   */
  @Get(':id')
  @RequirePermissions('read_services')
  @ApiOperation({ summary: 'Obtener servicio por ID' })
  findOne(@Param('id') id: string) {
    return this.servicesService.findOne(id);
  }

  /**
   * POST /api/v1/services
   * Crea un nuevo servicio
   * Requiere permiso: create_services
   */
  @Post()
  @RequirePermissions('create_services')
  @ApiOperation({ summary: 'Crear nuevo servicio' })
  create(@Body() createServiceDto: CreateServiceDto) {
    return this.servicesService.create(createServiceDto);
  }

  /**
   * PUT /api/v1/services/:id
   * Actualiza un servicio
   * Requiere permiso: update_services
   */
  @Put(':id')
  @RequirePermissions('update_services')
  @ApiOperation({ summary: 'Actualizar servicio' })
  update(
    @Param('id') id: string,
    @Body() updateServiceDto: UpdateServiceDto,
  ) {
    return this.servicesService.update(id, updateServiceDto);
  }

  /**
   * DELETE /api/v1/services/:id
   * Soft delete de un servicio
   * Requiere permiso: delete_services
   */
  @Delete(':id')
  @RequirePermissions('delete_services')
  @ApiOperation({ summary: 'Eliminar servicio (soft delete)' })
  remove(@Param('id') id: string) {
    return this.servicesService.remove(id);
  }
}
