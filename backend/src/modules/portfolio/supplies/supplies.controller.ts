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
import { SuppliesService } from './supplies.service';
import { CreateSupplyDto, UpdateSupplyDto } from './dto';
import { JwtAuthGuard } from '../../auth/guards';
import { PermissionsGuard } from '../../../common/guards';
import { RequirePermissions } from '../../../common/decorators';

@ApiTags('supplies')
@ApiBearerAuth('JWT-auth')
@Controller('supplies')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class SuppliesController {
  constructor(private readonly suppliesService: SuppliesService) {}

  /**
   * GET /api/v1/supplies
   * Lista todos los insumos
   * Requiere permiso: read_supplies
   */
  @Get()
  @RequirePermissions('read_supplies')
  @ApiOperation({ summary: 'Listar todos los insumos' })
  @ApiQuery({
    name: 'includeInactive',
    required: false,
    type: Boolean,
    description: 'Incluir insumos inactivos',
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
    return this.suppliesService.findAll(
      includeInactive === 'true',
      categoryId,
    );
  }

  /**
   * GET /api/v1/supplies/low-stock
   * Obtiene insumos con stock bajo
   * Requiere permiso: read_supplies
   */
  @Get('low-stock')
  @RequirePermissions('read_supplies')
  @ApiOperation({ summary: 'Obtener insumos con stock bajo' })
  findLowStock() {
    return this.suppliesService.findLowStock();
  }

  /**
   * GET /api/v1/supplies/:id
   * Obtiene un insumo por ID
   * Requiere permiso: read_supplies
   */
  @Get(':id')
  @RequirePermissions('read_supplies')
  @ApiOperation({ summary: 'Obtener insumo por ID' })
  findOne(@Param('id') id: string) {
    return this.suppliesService.findOne(id);
  }

  /**
   * POST /api/v1/supplies
   * Crea un nuevo insumo
   * Requiere permiso: create_supplies
   */
  @Post()
  @RequirePermissions('create_supplies')
  @ApiOperation({ summary: 'Crear nuevo insumo' })
  create(@Body() createSupplyDto: CreateSupplyDto) {
    return this.suppliesService.create(createSupplyDto);
  }

  /**
   * PUT /api/v1/supplies/:id
   * Actualiza un insumo
   * Requiere permiso: update_supplies
   */
  @Put(':id')
  @RequirePermissions('update_supplies')
  @ApiOperation({ summary: 'Actualizar insumo' })
  update(
    @Param('id') id: string,
    @Body() updateSupplyDto: UpdateSupplyDto,
  ) {
    return this.suppliesService.update(id, updateSupplyDto);
  }

  /**
   * DELETE /api/v1/supplies/:id
   * Soft delete de un insumo
   * Requiere permiso: delete_supplies
   */
  @Delete(':id')
  @RequirePermissions('delete_supplies')
  @ApiOperation({ summary: 'Eliminar insumo (soft delete)' })
  remove(@Param('id') id: string) {
    return this.suppliesService.remove(id);
  }
}
