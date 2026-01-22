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
  create(@Body() createSupplierDto: CreateSupplierDto) {
    return this.suppliersService.create(createSupplierDto);
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
