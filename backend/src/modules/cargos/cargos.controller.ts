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
import { CargosService } from './cargos.service';
import { CreateCargoDto, UpdateCargoDto } from './dto';
import { JwtAuthGuard } from '../auth/guards';
import { PermissionsGuard } from '../../common/guards';
import { RequirePermissions } from '../../common/decorators';

@ApiTags('cargos')
@ApiBearerAuth('JWT-auth')
@Controller('cargos')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class CargosController {
  constructor(private readonly cargosService: CargosService) {}

  /**
   * GET /api/v1/cargos
   * Lista todos los cargos
   * Requiere permiso: read_cargos
   */
  @Get()
  @RequirePermissions('read_cargos')
  @ApiOperation({ summary: 'Listar todos los cargos' })
  @ApiQuery({
    name: 'includeInactive',
    required: false,
    type: Boolean,
    description: 'Incluir cargos inactivos',
  })
  findAll(@Query('includeInactive') includeInactive?: string) {
    return this.cargosService.findAll(includeInactive === 'true');
  }

  /**
   * GET /api/v1/cargos/area/:areaId
   * Lista cargos por área
   * Requiere permiso: read_cargos
   */
  @Get('area/:areaId')
  @RequirePermissions('read_cargos')
  @ApiOperation({ summary: 'Listar cargos por área' })
  @ApiQuery({
    name: 'includeInactive',
    required: false,
    type: Boolean,
    description: 'Incluir cargos inactivos',
  })
  findByArea(
    @Param('areaId') areaId: string,
    @Query('includeInactive') includeInactive?: string,
  ) {
    return this.cargosService.findByArea(areaId, includeInactive === 'true');
  }

  /**
   * GET /api/v1/cargos/:id
   * Obtiene un cargo por ID
   * Requiere permiso: read_cargos
   */
  @Get(':id')
  @RequirePermissions('read_cargos')
  @ApiOperation({ summary: 'Obtener cargo por ID' })
  findOne(@Param('id') id: string) {
    return this.cargosService.findOne(id);
  }

  /**
   * POST /api/v1/cargos
   * Crea un nuevo cargo
   * Requiere permiso: create_cargos
   */
  @Post()
  @RequirePermissions('create_cargos')
  @ApiOperation({ summary: 'Crear nuevo cargo' })
  create(@Body() createCargoDto: CreateCargoDto) {
    return this.cargosService.create(createCargoDto);
  }

  /**
   * PUT /api/v1/cargos/:id
   * Actualiza un cargo
   * Requiere permiso: update_cargos
   */
  @Put(':id')
  @RequirePermissions('update_cargos')
  @ApiOperation({ summary: 'Actualizar cargo' })
  update(@Param('id') id: string, @Body() updateCargoDto: UpdateCargoDto) {
    return this.cargosService.update(id, updateCargoDto);
  }

  /**
   * DELETE /api/v1/cargos/:id
   * Soft delete de un cargo
   * Requiere permiso: delete_cargos
   */
  @Delete(':id')
  @RequirePermissions('delete_cargos')
  @ApiOperation({ summary: 'Eliminar cargo (soft delete)' })
  remove(@Param('id') id: string) {
    return this.cargosService.remove(id);
  }
}
