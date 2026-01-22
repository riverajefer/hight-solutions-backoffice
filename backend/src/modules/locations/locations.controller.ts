import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { LocationsService } from './locations.service';

@ApiTags('locations')
@Controller('locations')
export class LocationsController {
  constructor(private readonly locationsService: LocationsService) {}

  @Get('departments')
  @Public()
  @ApiOperation({ summary: 'Listar todos los departamentos de Colombia' })
  @ApiResponse({
    status: 200,
    description: 'Lista de departamentos con conteo de ciudades',
  })
  findAllDepartments() {
    return this.locationsService.findAllDepartments();
  }

  @Get('departments/:id')
  @Public()
  @ApiOperation({ summary: 'Obtener departamento por ID con sus ciudades' })
  @ApiParam({ name: 'id', description: 'ID del departamento' })
  @ApiResponse({
    status: 200,
    description: 'Departamento con lista de ciudades',
  })
  @ApiResponse({
    status: 404,
    description: 'Departamento no encontrado',
  })
  findDepartmentById(@Param('id') id: string) {
    return this.locationsService.findDepartmentById(id);
  }

  @Get('departments/:id/cities')
  @Public()
  @ApiOperation({ summary: 'Obtener ciudades de un departamento' })
  @ApiParam({ name: 'id', description: 'ID del departamento' })
  @ApiResponse({
    status: 200,
    description: 'Lista de ciudades del departamento',
  })
  @ApiResponse({
    status: 404,
    description: 'Departamento no encontrado',
  })
  findCitiesByDepartment(@Param('id') id: string) {
    return this.locationsService.findCitiesByDepartment(id);
  }

  @Get('cities/:id')
  @Public()
  @ApiOperation({ summary: 'Obtener ciudad por ID' })
  @ApiParam({ name: 'id', description: 'ID de la ciudad' })
  @ApiResponse({
    status: 200,
    description: 'Ciudad con información del departamento',
  })
  @ApiResponse({
    status: 404,
    description: 'Ciudad no encontrada',
  })
  findCityById(@Param('id') id: string) {
    return this.locationsService.findCityById(id);
  }
}
