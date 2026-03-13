import { Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { ProductTemplatesService } from './product-templates.service';
import { CreateProductTemplateDto, UpdateProductTemplateDto } from './dto';

@ApiTags('product-templates')
@ApiBearerAuth()
@Controller('product-templates')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ProductTemplatesController {
  constructor(private readonly service: ProductTemplatesService) {}

  @Get()
  @RequirePermissions('read_product_templates')
  @ApiOperation({ summary: 'Listar plantillas de producto' })
  @ApiQuery({ name: 'category', required: false })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  findAll(
    @Query('category') category?: string,
    @Query('isActive') isActive?: string,
  ) {
    return this.service.findAll({
      category,
      isActive: isActive !== undefined ? isActive === 'true' : undefined,
    });
  }

  @Get(':id')
  @RequirePermissions('read_product_templates')
  @ApiOperation({ summary: 'Obtener detalle de una plantilla con componentes y pasos' })
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @RequirePermissions('create_product_templates')
  @ApiOperation({ summary: 'Crear plantilla de producto completa (con componentes y pasos)' })
  create(@Body() dto: CreateProductTemplateDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @RequirePermissions('update_product_templates')
  @ApiOperation({ summary: 'Actualizar datos básicos de la plantilla' })
  update(@Param('id') id: string, @Body() dto: UpdateProductTemplateDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @RequirePermissions('delete_product_templates')
  @ApiOperation({ summary: 'Desactivar plantilla (soft delete)' })
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
