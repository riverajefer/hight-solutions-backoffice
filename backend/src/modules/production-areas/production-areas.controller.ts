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
import { ApiBearerAuth, ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { ProductionAreasService } from './production-areas.service';
import { CreateProductionAreaDto, UpdateProductionAreaDto } from './dto';
import { JwtAuthGuard } from '../auth/guards';
import { PermissionsGuard } from '../../common/guards';
import { RequirePermissions } from '../../common/decorators';

@ApiTags('production-areas')
@ApiBearerAuth('JWT-auth')
@Controller('production-areas')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ProductionAreasController {
  constructor(private readonly productionAreasService: ProductionAreasService) {}

  /**
   * GET /api/v1/production-areas
   * Lista todas las áreas de producción
   * Requiere permiso: read_production_areas
   */
  @Get()
  @RequirePermissions('read_production_areas')
  @ApiOperation({ summary: 'Listar todas las áreas de producción' })
  @ApiQuery({
    name: 'includeInactive',
    required: false,
    type: Boolean,
    description: 'Incluir áreas inactivas',
  })
  findAll(@Query('includeInactive') includeInactive?: string) {
    return this.productionAreasService.findAll(includeInactive === 'true');
  }

  /**
   * GET /api/v1/production-areas/:id
   * Obtiene un área de producción por ID
   * Requiere permiso: read_production_areas
   */
  @Get(':id')
  @RequirePermissions('read_production_areas')
  @ApiOperation({ summary: 'Obtener área de producción por ID' })
  findOne(@Param('id') id: string) {
    return this.productionAreasService.findOne(id);
  }

  /**
   * POST /api/v1/production-areas
   * Crea una nueva área de producción
   * Requiere permiso: create_production_areas
   */
  @Post()
  @RequirePermissions('create_production_areas')
  @ApiOperation({ summary: 'Crear nueva área de producción' })
  create(@Body() createProductionAreaDto: CreateProductionAreaDto) {
    return this.productionAreasService.create(createProductionAreaDto);
  }

  /**
   * PUT /api/v1/production-areas/:id
   * Actualiza un área de producción
   * Requiere permiso: update_production_areas
   */
  @Put(':id')
  @RequirePermissions('update_production_areas')
  @ApiOperation({ summary: 'Actualizar área de producción' })
  update(
    @Param('id') id: string,
    @Body() updateProductionAreaDto: UpdateProductionAreaDto,
  ) {
    return this.productionAreasService.update(id, updateProductionAreaDto);
  }

  /**
   * DELETE /api/v1/production-areas/:id
   * Soft delete de un área de producción
   * Requiere permiso: delete_production_areas
   */
  @Delete(':id')
  @RequirePermissions('delete_production_areas')
  @ApiOperation({ summary: 'Eliminar área de producción (soft delete)' })
  remove(@Param('id') id: string) {
    return this.productionAreasService.remove(id);
  }
}
