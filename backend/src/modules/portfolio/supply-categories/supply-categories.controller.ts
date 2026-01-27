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
import { SupplyCategoriesService } from './supply-categories.service';
import {
  CreateSupplyCategoryDto,
  UpdateSupplyCategoryDto,
} from './dto';
import { JwtAuthGuard } from '../../auth/guards';
import { PermissionsGuard } from '../../../common/guards';
import { RequirePermissions } from '../../../common/decorators';

@ApiTags('supply-categories')
@ApiBearerAuth('JWT-auth')
@Controller('supply-categories')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class SupplyCategoriesController {
  constructor(
    private readonly supplyCategoriesService: SupplyCategoriesService,
  ) {}

  /**
   * GET /api/v1/supply-categories
   * Lista todas las categorías de insumos
   * Requiere permiso: read_supply_categories
   */
  @Get()
  @RequirePermissions('read_supply_categories')
  @ApiOperation({ summary: 'Listar todas las categorías de insumos' })
  @ApiQuery({
    name: 'includeInactive',
    required: false,
    type: Boolean,
    description: 'Incluir categorías inactivas',
  })
  findAll(@Query('includeInactive') includeInactive?: string) {
    return this.supplyCategoriesService.findAll(includeInactive === 'true');
  }

  /**
   * GET /api/v1/supply-categories/:id
   * Obtiene una categoría de insumo por ID
   * Requiere permiso: read_supply_categories
   */
  @Get(':id')
  @RequirePermissions('read_supply_categories')
  @ApiOperation({ summary: 'Obtener categoría de insumo por ID' })
  findOne(@Param('id') id: string) {
    return this.supplyCategoriesService.findOne(id);
  }

  /**
   * POST /api/v1/supply-categories
   * Crea una nueva categoría de insumo
   * Requiere permiso: create_supply_categories
   */
  @Post()
  @RequirePermissions('create_supply_categories')
  @ApiOperation({ summary: 'Crear nueva categoría de insumo' })
  create(@Body() createSupplyCategoryDto: CreateSupplyCategoryDto) {
    return this.supplyCategoriesService.create(createSupplyCategoryDto);
  }

  /**
   * PUT /api/v1/supply-categories/:id
   * Actualiza una categoría de insumo
   * Requiere permiso: update_supply_categories
   */
  @Put(':id')
  @RequirePermissions('update_supply_categories')
  @ApiOperation({ summary: 'Actualizar categoría de insumo' })
  update(
    @Param('id') id: string,
    @Body() updateSupplyCategoryDto: UpdateSupplyCategoryDto,
  ) {
    return this.supplyCategoriesService.update(
      id,
      updateSupplyCategoryDto,
    );
  }

  /**
   * DELETE /api/v1/supply-categories/:id
   * Soft delete de una categoría de insumo
   * Requiere permiso: delete_supply_categories
   */
  @Delete(':id')
  @RequirePermissions('delete_supply_categories')
  @ApiOperation({
    summary: 'Eliminar categoría de insumo (soft delete)',
  })
  remove(@Param('id') id: string) {
    return this.supplyCategoriesService.remove(id);
  }
}
