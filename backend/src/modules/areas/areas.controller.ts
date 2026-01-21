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
import { AreasService } from './areas.service';
import { CreateAreaDto, UpdateAreaDto } from './dto';
import { JwtAuthGuard } from '../auth/guards';
import { PermissionsGuard } from '../../common/guards';
import { RequirePermissions } from '../../common/decorators';

@ApiTags('areas')
@ApiBearerAuth('JWT-auth')
@Controller('areas')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AreasController {
  constructor(private readonly areasService: AreasService) {}

  /**
   * GET /api/v1/areas
   * Lista todas las áreas
   * Requiere permiso: read_areas
   */
  @Get()
  @RequirePermissions('read_areas')
  @ApiOperation({ summary: 'Listar todas las áreas' })
  @ApiQuery({
    name: 'includeInactive',
    required: false,
    type: Boolean,
    description: 'Incluir áreas inactivas',
  })
  findAll(@Query('includeInactive') includeInactive?: string) {
    return this.areasService.findAll(includeInactive === 'true');
  }

  /**
   * GET /api/v1/areas/:id
   * Obtiene un área por ID con sus cargos
   * Requiere permiso: read_areas
   */
  @Get(':id')
  @RequirePermissions('read_areas')
  @ApiOperation({ summary: 'Obtener área por ID con sus cargos' })
  findOne(@Param('id') id: string) {
    return this.areasService.findOne(id);
  }

  /**
   * POST /api/v1/areas
   * Crea una nueva área
   * Requiere permiso: create_areas
   */
  @Post()
  @RequirePermissions('create_areas')
  @ApiOperation({ summary: 'Crear nueva área' })
  create(@Body() createAreaDto: CreateAreaDto) {
    return this.areasService.create(createAreaDto);
  }

  /**
   * PUT /api/v1/areas/:id
   * Actualiza un área
   * Requiere permiso: update_areas
   */
  @Put(':id')
  @RequirePermissions('update_areas')
  @ApiOperation({ summary: 'Actualizar área' })
  update(@Param('id') id: string, @Body() updateAreaDto: UpdateAreaDto) {
    return this.areasService.update(id, updateAreaDto);
  }

  /**
   * DELETE /api/v1/areas/:id
   * Soft delete de un área
   * Requiere permiso: delete_areas
   */
  @Delete(':id')
  @RequirePermissions('delete_areas')
  @ApiOperation({ summary: 'Eliminar área (soft delete)' })
  remove(@Param('id') id: string) {
    return this.areasService.remove(id);
  }
}
