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
import { UnitsOfMeasureService } from './units-of-measure.service';
import { CreateUnitOfMeasureDto, UpdateUnitOfMeasureDto } from './dto';
import { JwtAuthGuard } from '../../auth/guards';
import { PermissionsGuard } from '../../../common/guards';
import { RequirePermissions } from '../../../common/decorators';

@ApiTags('units-of-measure')
@ApiBearerAuth('JWT-auth')
@Controller('units-of-measure')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class UnitsOfMeasureController {
  constructor(
    private readonly unitsOfMeasureService: UnitsOfMeasureService,
  ) {}

  /**
   * GET /api/v1/units-of-measure
   * Lista todas las unidades de medida
   * Requiere permiso: read_units_of_measure
   */
  @Get()
  @RequirePermissions('read_units_of_measure')
  @ApiOperation({ summary: 'Listar todas las unidades de medida' })
  @ApiQuery({
    name: 'includeInactive',
    required: false,
    type: Boolean,
    description: 'Incluir unidades inactivas',
  })
  findAll(@Query('includeInactive') includeInactive?: string) {
    return this.unitsOfMeasureService.findAll(includeInactive === 'true');
  }

  /**
   * GET /api/v1/units-of-measure/:id
   * Obtiene una unidad de medida por ID
   * Requiere permiso: read_units_of_measure
   */
  @Get(':id')
  @RequirePermissions('read_units_of_measure')
  @ApiOperation({ summary: 'Obtener unidad de medida por ID' })
  findOne(@Param('id') id: string) {
    return this.unitsOfMeasureService.findOne(id);
  }

  /**
   * POST /api/v1/units-of-measure
   * Crea una nueva unidad de medida
   * Requiere permiso: create_units_of_measure
   */
  @Post()
  @RequirePermissions('create_units_of_measure')
  @ApiOperation({ summary: 'Crear nueva unidad de medida' })
  create(@Body() createUnitOfMeasureDto: CreateUnitOfMeasureDto) {
    return this.unitsOfMeasureService.create(createUnitOfMeasureDto);
  }

  /**
   * PUT /api/v1/units-of-measure/:id
   * Actualiza una unidad de medida
   * Requiere permiso: update_units_of_measure
   */
  @Put(':id')
  @RequirePermissions('update_units_of_measure')
  @ApiOperation({ summary: 'Actualizar unidad de medida' })
  update(
    @Param('id') id: string,
    @Body() updateUnitOfMeasureDto: UpdateUnitOfMeasureDto,
  ) {
    return this.unitsOfMeasureService.update(id, updateUnitOfMeasureDto);
  }

  /**
   * DELETE /api/v1/units-of-measure/:id
   * Soft delete de una unidad de medida
   * Requiere permiso: delete_units_of_measure
   */
  @Delete(':id')
  @RequirePermissions('delete_units_of_measure')
  @ApiOperation({ summary: 'Eliminar unidad de medida (soft delete)' })
  remove(@Param('id') id: string) {
    return this.unitsOfMeasureService.remove(id);
  }
}
