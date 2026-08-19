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
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { SuppliersService } from './suppliers.service';
import { CreateSupplierDto, UpdateSupplierDto } from './dto';

@ApiTags('suppliers')
@ApiBearerAuth('JWT-auth')
@Controller('suppliers')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class SuppliersController {
  constructor(private readonly suppliersService: SuppliersService) {}

  @Get()
  @RequirePermissions('read_suppliers')
  @ApiOperation({ summary: 'Listar todos los proveedores' })
  @ApiQuery({
    name: 'includeInactive',
    required: false,
    type: Boolean,
    description: 'Incluir proveedores inactivos',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de proveedores con información de ubicación',
  })
  findAll(@Query('includeInactive') includeInactive?: string) {
    return this.suppliersService.findAll(includeInactive === 'true');
  }

  // Antes de `@Get(':id')`: si no, "check-duplicate" se toma como un id.
  @Get('check-duplicate')
  @RequirePermissions('create_suppliers')
  @ApiOperation({
    summary: 'Consultar si ya existe un proveedor con ese nombre',
    description: 'Solo compara por nombre: el NIT suele venir con valores de relleno.',
  })
  @ApiQuery({ name: 'name', required: false })
  @ApiResponse({ status: 200, description: 'Lista de posibles duplicados (vacía si no hay)' })
  checkDuplicate(@Query('name') name?: string) {
    return this.suppliersService.findDuplicates(name);
  }

  @Get(':id')
  @RequirePermissions('read_suppliers')
  @ApiOperation({ summary: 'Obtener proveedor por ID' })
  @ApiParam({ name: 'id', description: 'ID del proveedor' })
  @ApiResponse({
    status: 200,
    description: 'Proveedor encontrado',
  })
  @ApiResponse({
    status: 404,
    description: 'Proveedor no encontrado',
  })
  findOne(@Param('id') id: string) {
    return this.suppliersService.findOne(id);
  }

  @Post()
  @RequirePermissions('create_suppliers')
  @ApiOperation({ summary: 'Crear nuevo proveedor' })
  @ApiResponse({
    status: 201,
    description: 'Proveedor creado exitosamente',
  })
  @ApiResponse({
    status: 400,
    description: 'Datos inválidos o email duplicado',
  })
  @ApiResponse({
    status: 409,
    description:
      'Ya existe un proveedor con ese nombre. Reenviar con `?force=true` para crear igual.',
  })
  @ApiQuery({
    name: 'force',
    required: false,
    type: Boolean,
    description: 'Crear pese al aviso de duplicado',
  })
  create(@Body() createSupplierDto: CreateSupplierDto, @Query('force') force?: string) {
    return this.suppliersService.create(createSupplierDto, { force: force === 'true' });
  }

  @Put(':id')
  @RequirePermissions('update_suppliers')
  @ApiOperation({ summary: 'Actualizar proveedor' })
  @ApiParam({ name: 'id', description: 'ID del proveedor' })
  @ApiResponse({
    status: 200,
    description: 'Proveedor actualizado exitosamente',
  })
  @ApiResponse({
    status: 400,
    description: 'Datos inválidos',
  })
  @ApiResponse({
    status: 404,
    description: 'Proveedor no encontrado',
  })
  update(@Param('id') id: string, @Body() updateSupplierDto: UpdateSupplierDto) {
    return this.suppliersService.update(id, updateSupplierDto);
  }

  @Delete(':id')
  @RequirePermissions('delete_suppliers')
  @ApiOperation({ summary: 'Eliminar proveedor (soft delete)' })
  @ApiParam({ name: 'id', description: 'ID del proveedor' })
  @ApiResponse({
    status: 200,
    description: 'Proveedor eliminado exitosamente',
  })
  @ApiResponse({
    status: 404,
    description: 'Proveedor no encontrado',
  })
  remove(@Param('id') id: string) {
    return this.suppliersService.remove(id);
  }
}
