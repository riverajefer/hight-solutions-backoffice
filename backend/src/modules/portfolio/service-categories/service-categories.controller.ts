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
import { ServiceCategoriesService } from './service-categories.service';
import {
  CreateServiceCategoryDto,
  UpdateServiceCategoryDto,
} from './dto';
import { JwtAuthGuard } from '../../auth/guards';
import { PermissionsGuard } from '../../../common/guards';
import { RequirePermissions } from '../../../common/decorators';

@ApiTags('service-categories')
@ApiBearerAuth('JWT-auth')
@Controller('service-categories')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ServiceCategoriesController {
  constructor(
    private readonly serviceCategoriesService: ServiceCategoriesService,
  ) {}

  /**
   * GET /api/v1/service-categories
   * Lista todas las categorías de servicios
   * Requiere permiso: read_service_categories
   */
  @Get()
  @RequirePermissions('read_service_categories')
  @ApiOperation({ summary: 'Listar todas las categorías de servicios' })
  @ApiQuery({
    name: 'includeInactive',
    required: false,
    type: Boolean,
    description: 'Incluir categorías inactivas',
  })
  findAll(@Query('includeInactive') includeInactive?: string) {
    return this.serviceCategoriesService.findAll(includeInactive === 'true');
  }

  /**
   * GET /api/v1/service-categories/:id
   * Obtiene una categoría de servicio por ID
   * Requiere permiso: read_service_categories
   */
  @Get(':id')
  @RequirePermissions('read_service_categories')
  @ApiOperation({ summary: 'Obtener categoría de servicio por ID' })
  findOne(@Param('id') id: string) {
    return this.serviceCategoriesService.findOne(id);
  }

  /**
   * POST /api/v1/service-categories
   * Crea una nueva categoría de servicio
   * Requiere permiso: create_service_categories
   */
  @Post()
  @RequirePermissions('create_service_categories')
  @ApiOperation({ summary: 'Crear nueva categoría de servicio' })
  create(@Body() createServiceCategoryDto: CreateServiceCategoryDto) {
    return this.serviceCategoriesService.create(createServiceCategoryDto);
  }

  /**
   * PUT /api/v1/service-categories/:id
   * Actualiza una categoría de servicio
   * Requiere permiso: update_service_categories
   */
  @Put(':id')
  @RequirePermissions('update_service_categories')
  @ApiOperation({ summary: 'Actualizar categoría de servicio' })
  update(
    @Param('id') id: string,
    @Body() updateServiceCategoryDto: UpdateServiceCategoryDto,
  ) {
    return this.serviceCategoriesService.update(
      id,
      updateServiceCategoryDto,
    );
  }

  /**
   * DELETE /api/v1/service-categories/:id
   * Soft delete de una categoría de servicio
   * Requiere permiso: delete_service_categories
   */
  @Delete(':id')
  @RequirePermissions('delete_service_categories')
  @ApiOperation({
    summary: 'Eliminar categoría de servicio (soft delete)',
  })
  remove(@Param('id') id: string) {
    return this.serviceCategoriesService.remove(id);
  }
}
